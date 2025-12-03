const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.connect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const userId = event.queryStringParameters?.userId;

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

  await docClient.send(new DeleteCommand({
    TableName: process.env.CONNECTIONS_TABLE,
    Key: { connectionId }
  }));

  return { statusCode: 200 };
};

exports.message = async (event) => {
  return { statusCode: 200 };
};
