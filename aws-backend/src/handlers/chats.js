const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

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

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(result.Items)
  };
};

exports.createChat = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const { participantId } = JSON.parse(event.body);
  
  const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const chat = {
    chatId,
    participants: [userId, participantId],
    createdAt: new Date().toISOString(),
    lastMessageTime: Date.now()
  };

  await docClient.send(new PutCommand({
    TableName: process.env.CHATS_TABLE,
    Item: chat
  }));

  return {
    statusCode: 201,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(chat)
  };
};
