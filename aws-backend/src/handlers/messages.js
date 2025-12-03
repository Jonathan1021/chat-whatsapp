const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.getMessages = async (event) => {
  try {
    const { chatId } = event.pathParameters;
    const limit = parseInt(event.queryStringParameters?.limit || '100');
    const lastKey = event.queryStringParameters?.lastKey;

    const params = {
      TableName: process.env.MESSAGES_TABLE,
      IndexName: 'ChatMessagesIndex',
      KeyConditionExpression: 'chatId = :chatId',
      ExpressionAttributeValues: { ':chatId': chatId },
      ScanIndexForward: false,
      Limit: limit
    };

    if (lastKey) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString());
    }

    const result = await docClient.send(new QueryCommand(params));

    // Obtener info de los remitentes
    const senderIds = [...new Set(result.Items.map(msg => msg.senderId))];
    const sendersInfo = {};
    
    await Promise.all(senderIds.map(async (senderId) => {
      const userResult = await docClient.send(new GetCommand({
        TableName: process.env.USERS_TABLE,
        Key: { userId: senderId }
      }));
      sendersInfo[senderId] = {
        name: userResult.Item?.name || 'Usuario',
        avatar: getInitials(userResult.Item?.name || 'U')
      };
    }));

    const messages = (result.Items || []).reverse().map(msg => ({
      ...msg,
      id: msg.messageId,
      senderName: sendersInfo[msg.senderId]?.name,
      senderAvatar: sendersInfo[msg.senderId]?.avatar
    }));

    const response = {
      messages,
      lastKey: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null
    };

    return {
      statusCode: 200,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error getting messages:', error);
    return {
      statusCode: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

exports.sendMessage = async (event) => {
  const { chatId } = event.pathParameters;
  const userId = event.requestContext.authorizer.claims.sub;
  const { content } = JSON.parse(event.body);
  
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = Date.now();

  const message = {
    id: messageId,
    messageId,
    chatId,
    senderId: userId,
    content,
    timestamp,
    status: 'sent',
    createdAt: new Date().toISOString()
  };

  await docClient.send(new PutCommand({
    TableName: process.env.MESSAGES_TABLE,
    Item: message
  }));

  // Obtener participantes del chat y actualizar lastMessageTime para ambos
  const chatsResult = await docClient.send(new QueryCommand({
    TableName: process.env.CHATS_TABLE,
    IndexName: 'UserChatsIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId }
  }));

  const userChat = chatsResult.Items?.find(c => c.chatId === chatId);
  if (userChat) {
    const participants = [userId, userChat.otherUserId];
    
    await Promise.all(participants.map(participantId => 
      docClient.send(new UpdateCommand({
        TableName: process.env.CHATS_TABLE,
        Key: { chatId: `${chatId}#${participantId}` },
        UpdateExpression: 'SET lastMessageTime = :time',
        ExpressionAttributeValues: { ':time': timestamp }
      }))
    ));
  }

  return {
    statusCode: 201,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(message)
  };
};


