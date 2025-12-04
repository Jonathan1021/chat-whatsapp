const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand, GetCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.getChats = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;

  const result = await docClient.send(new QueryCommand({
    TableName: process.env.CHATS_TABLE,
    IndexName: 'UserChatsIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    ScanIndexForward: false
  }));

  // Eliminar duplicados por chatId
  const uniqueChats = [];
  const seenChatIds = new Set();
  
  for (const chat of result.Items) {
    if (!seenChatIds.has(chat.chatId)) {
      seenChatIds.add(chat.chatId);
      uniqueChats.push(chat);
    }
  }

  // Obtener info de los chats (individuales y grupos)
  const chatsWithUsers = await Promise.all(uniqueChats.map(async (chat) => {
    const simpleChatId = chat.chatId.split('#')[0];
    
    // Si es grupo
    if (chat.isGroup) {
      const membersInfo = await Promise.all((chat.members || []).map(async (memberId) => {
        if (memberId === userId) return null;
        const userResult = await docClient.send(new GetCommand({
          TableName: process.env.USERS_TABLE,
          Key: { userId: memberId }
        }));
        return {
          id: memberId,
          name: userResult.Item?.name || 'Usuario',
          email: userResult.Item?.email || '',
          avatar: getInitials(userResult.Item?.name || 'U'),
          online: false
        };
      }));
      
      return {
        id: simpleChatId,
        chatId: simpleChatId,
        groupName: chat.groupName,
        groupDescription: chat.groupDescription,
        isGroup: true,
        participants: membersInfo.filter(m => m !== null),
        lastMessage: null,
        unreadCount: 0,
        isTyping: false,
        removed: chat.removed || false
      };
    }
    
    // Si es chat individual
    const userResult = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId: chat.otherUserId }
    }));
    
    return {
      id: simpleChatId,
      chatId: simpleChatId,
      participants: [{
        id: userResult.Item?.userId || chat.otherUserId,
        name: userResult.Item?.name || 'Usuario',
        email: userResult.Item?.email || '',
        avatar: getInitials(userResult.Item?.name || 'U'),
        online: false
      }],
      lastMessage: null,
      unreadCount: 0,
      isTyping: false
    };
  }));

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(chatsWithUsers)
  };
};

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

exports.createChat = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const { participantId } = JSON.parse(event.body);
  
  // Verificar si ya existe un chat entre estos usuarios
  const existingChats = await docClient.send(new QueryCommand({
    TableName: process.env.CHATS_TABLE,
    IndexName: 'UserChatsIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId }
  }));

  const existingChat = existingChats.Items?.find(c => c.otherUserId === participantId);
  if (existingChat) {
    // Retornar chat existente
    const userResult = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId: participantId }
    }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        id: existingChat.chatId,
        chatId: existingChat.chatId,
        participants: [{
          id: userResult.Item?.userId || participantId,
          name: userResult.Item?.name || 'Usuario',
          email: userResult.Item?.email || '',
          avatar: getInitials(userResult.Item?.name || 'U'),
          online: false
        }],
        lastMessage: null,
        unreadCount: 0,
        isTyping: false
      })
    };
  }
  
  // Crear ID único ordenando los userIds para garantizar el mismo chatId
  const sortedIds = [userId, participantId].sort();
  const chatId = `chat_${sortedIds[0]}_${sortedIds[1]}`;
  const now = Date.now();
  
  // Crear entrada para cada participante
  await Promise.all([
    docClient.send(new PutCommand({
      TableName: process.env.CHATS_TABLE,
      Item: {
        chatId: `${chatId}#${userId}`,
        userId,
        otherUserId: participantId,
        chatId,
        lastMessageTime: now,
        createdAt: new Date().toISOString()
      }
    })),
    docClient.send(new PutCommand({
      TableName: process.env.CHATS_TABLE,
      Item: {
        chatId: `${chatId}#${participantId}`,
        userId: participantId,
        otherUserId: userId,
        chatId,
        lastMessageTime: now,
        createdAt: new Date().toISOString()
      }
    }))
  ]);

  // Obtener info del participante
  const userResult = await docClient.send(new GetCommand({
    TableName: process.env.USERS_TABLE,
    Key: { userId: participantId }
  }));

  return {
    statusCode: 201,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      id: chatId,
      chatId,
      participants: [{
        id: userResult.Item?.userId || participantId,
        name: userResult.Item?.name || 'Usuario',
        email: userResult.Item?.email || '',
        avatar: getInitials(userResult.Item?.name || 'U'),
        online: false
      }],
      lastMessage: null,
      unreadCount: 0,
      isTyping: false
    })
  };
};
