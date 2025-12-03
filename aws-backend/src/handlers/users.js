const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.getUsers = async (event) => {
  const currentUserId = event.requestContext.authorizer.claims.sub;

  const result = await docClient.send(new ScanCommand({
    TableName: process.env.USERS_TABLE,
    FilterExpression: 'userId <> :currentUserId',
    ExpressionAttributeValues: { ':currentUserId': currentUserId }
  }));

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(result.Items)
  };
};

exports.saveUser = async (userId, email, name) => {
  await docClient.send(new PutCommand({
    TableName: process.env.USERS_TABLE,
    Item: {
      userId,
      email,
      name,
      createdAt: new Date().toISOString()
    }
  }));
};
