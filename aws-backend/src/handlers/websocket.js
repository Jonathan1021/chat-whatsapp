const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.connect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const userId = event.queryStringParameters?.userId;

  if (!userId) {
    return { statusCode: 400, body: 'userId required' };
  }

  console.log(`✅ Usuario ${userId} conectado. ConnectionId: ${connectionId}`);

  await docClient.send(new PutCommand({
    TableName: process.env.CONNECTIONS_TABLE,
    Item: {
      connectionId,
      userId,
      connectedAt: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + 86400
    }
  }));

  return { statusCode: 200 };
};

exports.disconnect = async (event) => {
  const connectionId = event.requestContext.connectionId;

  console.log(`🔌 Desconectando connectionId: ${connectionId}`);

  await docClient.send(new DeleteCommand({
    TableName: process.env.CONNECTIONS_TABLE,
    Key: { connectionId }
  }));

  return { statusCode: 200 };
};

exports.message = async (event) => {
  try {
    const { recipientId, content, senderId, chatId: providedChatId, isGroup } = JSON.parse(event.body);
    const domain = event.requestContext.domainName;
    const stage = event.requestContext.stage;

    console.log(`📨 Mensaje de ${senderId}`);

    const apiGateway = new ApiGatewayManagementApiClient({
      endpoint: `https://${domain}/${stage}`
    });

    let chatId, participants;

    // Si es grupo, usar el chatId proporcionado
    if (isGroup && providedChatId) {
      chatId = providedChatId;
      
      // Obtener miembros del grupo
      const groupResult = await docClient.send(new QueryCommand({
        TableName: process.env.CHATS_TABLE,
        IndexName: 'UserChatsIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': senderId }
      }));
      
      const groupChat = groupResult.Items?.find(c => c.groupId === chatId);
      participants = groupChat?.members || [];
      
      console.log(`📨 Mensaje grupal en ${chatId}`);
    } else {
      // Chat individual
      const sortedIds = [senderId, recipientId].sort();
      chatId = `chat_${sortedIds[0]}_${sortedIds[1]}`;
      participants = [senderId, recipientId];
      
      console.log(`📨 Mensaje individual para ${recipientId}`);
    }
    
    const senderChatKey = `${chatId}#${senderId}`;
    
    console.log(`🔍 Verificando canal: ${chatId}`);

    const existingChats = await docClient.send(new QueryCommand({
      TableName: process.env.CHATS_TABLE,
      IndexName: 'UserChatsIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': senderId }
    }));

    const existingChat = existingChats.Items?.find(c => c.chatId === senderChatKey);

    // 2. SI NO EXISTE, CREAR CANAL
    if (!existingChat) {
      console.log(`🆕 Creando nuevo canal: ${chatId}`);
      const now = Date.now();
      
      await Promise.all([
        docClient.send(new PutCommand({
          TableName: process.env.CHATS_TABLE,
          Item: {
            chatId: `${chatId}#${senderId}`,
            userId: senderId,
            otherUserId: recipientId,
            lastMessageTime: now,
            createdAt: new Date().toISOString()
          }
        })),
        docClient.send(new PutCommand({
          TableName: process.env.CHATS_TABLE,
          Item: {
            chatId: `${chatId}#${recipientId}`,
            userId: recipientId,
            otherUserId: senderId,
            lastMessageTime: now,
            createdAt: new Date().toISOString()
          }
        }))
      ]);
      
      console.log(`✅ Canal creado: ${chatId}`);
    } else {
      console.log(`♻️ Reutilizando canal existente: ${chatId}`);
    }

    // 3. GUARDAR MENSAJE EN EL CANAL
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    const message = {
      id: messageId,
      messageId,
      chatId,
      senderId,
      content,
      timestamp,
      status: 'sent',
      createdAt: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: process.env.MESSAGES_TABLE,
      Item: message
    }));

    console.log(`💾 Mensaje guardado: ${messageId}`);

    // Obtener info del remitente
    const senderInfo = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId: senderId }
    }));

    const senderName = senderInfo.Item?.name || 'Usuario';
    const senderAvatar = senderName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    const messageWithSender = {
      ...message,
      senderName,
      senderAvatar
    };

    // 4. ACTUALIZAR TIMESTAMP DEL CANAL
    await Promise.all(participants.map(participantId => 
      docClient.send(new UpdateCommand({
        TableName: process.env.CHATS_TABLE,
        Key: { chatId: `${chatId}#${participantId}` },
        UpdateExpression: 'SET lastMessageTime = :time',
        ExpressionAttributeValues: { ':time': timestamp }
      }))
    ));

    // Enviar mensaje solo a los otros participantes (no al remitente)
    const recipients = participants.filter(userId => userId !== senderId);
    const allConnections = await Promise.all(
      recipients.map(userId => 
        docClient.send(new QueryCommand({
          TableName: process.env.CONNECTIONS_TABLE,
          IndexName: 'UserConnectionsIndex',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId }
        }))
      )
    );

    const sendPromises = [];
    for (const result of allConnections) {
      for (const connection of result.Items || []) {
        sendPromises.push(
          apiGateway.send(new PostToConnectionCommand({
            ConnectionId: connection.connectionId,
            Data: JSON.stringify({ type: 'message', data: messageWithSender })
          })).catch(async (error) => {
            console.log(`⚠️ Error enviando a conexión ${connection.connectionId}:`, error.message);
            if (error.statusCode === 410 || error.statusCode === 403 || error.name === 'GoneException') {
              await docClient.send(new DeleteCommand({
                TableName: process.env.CONNECTIONS_TABLE,
                Key: { connectionId: connection.connectionId }
              }));
              console.log(`🗑️ Conexión obsoleta eliminada: ${connection.connectionId}`);
            }
          })
        );
      }
    }

    await Promise.all(sendPromises);
    console.log(`✅ Mensaje enviado a ${sendPromises.length} conexiones`);

    return { statusCode: 200 };
  } catch (error) {
    console.error('❌ Error en message handler:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
