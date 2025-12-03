const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.getMessages = async (event) => {
  const { chatId } = event.pathParameters;
  const limit = parseInt(event.queryStringParameters?.limit || '50');

  const result = await docClient.send(new QueryCommand({
    TableName: process.env.MESSAGES_TABLE,
    IndexName: 'ChatMessagesIndex',
    KeyConditionExpression: 'chatId = :chatId',
    ExpressionAttributeValues: { ':chatId': chatId },
    ScanIndexForward: true,
    Limit: limit
  }));

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(result.Items)
  };
};

exports.sendMessage = async (event) => {
  const { chatId } = event.pathParameters;
  const userId = event.requestContext.authorizer.claims.sub;
  const { content } = JSON.parse(event.body);
  
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = Date.now();

  const message = {
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

  await docClient.send(new UpdateCommand({
    TableName: process.env.CHATS_TABLE,
    Key: { chatId },
    UpdateExpression: 'SET lastMessageTime = :time, lastMessage = :msg',
    ExpressionAttributeValues: {
      ':time': timestamp,
      ':msg': message
    }
  }));

  return {
    statusCode: 201,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(message)
  };
};

exports.updateStatus = async (event) => {
  const { messageId } = event.pathParameters;
  const userId = event.requestContext.authorizer.claims.sub;
  const { status } = JSON.parse(event.body);

  await docClient.send(new PutCommand({
    TableName: process.env.MESSAGE_STATUS_TABLE,
    Item: {
      messageId,
      userId,
      status,
      timestamp: Date.now()
    }
  }));

  await docClient.send(new UpdateCommand({
    TableName: process.env.MESSAGES_TABLE,
    Key: { messageId },
    UpdateExpression: 'SET #status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': status }
  }));

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: true })
  };
};
