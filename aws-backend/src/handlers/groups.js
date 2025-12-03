const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.createGroup = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const { name, memberIds } = JSON.parse(event.body);

    if (!name || !memberIds || memberIds.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Name and members required' })
      };
    }

    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    // Agregar al creador si no está en la lista
    const allMembers = [...new Set([userId, ...memberIds])];

    // Crear entrada del grupo para cada miembro
    await Promise.all(allMembers.map(memberId =>
      docClient.send(new PutCommand({
        TableName: process.env.CHATS_TABLE,
        Item: {
          chatId: `${groupId}#${memberId}`,
          userId: memberId,
          groupId,
          groupName: name,
          isGroup: true,
          members: allMembers,
          createdBy: userId,
          lastMessageTime: now,
          createdAt: new Date().toISOString()
        }
      }))
    ));

    // Obtener info de los miembros
    const membersInfo = await Promise.all(allMembers.map(async (memberId) => {
      const userResult = await docClient.send(new GetCommand({
        TableName: process.env.USERS_TABLE,
        Key: { userId: memberId }
      }));
      return {
        id: memberId,
        name: userResult.Item?.name || 'Usuario',
        email: userResult.Item?.email || '',
        avatar: getInitials(userResult.Item?.name || 'U')
      };
    }));

    return {
      statusCode: 201,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        id: groupId,
        groupId,
        groupName: name,
        isGroup: true,
        participants: membersInfo,
        lastMessage: null,
        unreadCount: 0
      })
    };
  } catch (error) {
    console.error('Error creating group:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}
