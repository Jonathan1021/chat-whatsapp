const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.createGroup = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const { name, memberIds } = JSON.parse(event.body);

    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const allMembers = [userId, ...memberIds];
    const now = Date.now();

    await Promise.all(allMembers.map(memberId =>
      docClient.send(new PutCommand({
        TableName: process.env.CHATS_TABLE,
        Item: {
          chatId: `${groupId}#${memberId}`,
          userId: memberId,
          groupId: groupId,
          groupName: name,
          isGroup: true,
          members: allMembers,
          lastMessageTime: now,
          createdAt: new Date().toISOString()
        }
      }))
    ));

    return {
      statusCode: 201,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        id: groupId,
        groupName: name,
        isGroup: true,
        participants: [],
        lastMessage: undefined,
        unreadCount: 0,
        isTyping: false
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

exports.addMembers = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const { groupId } = event.pathParameters;
    const { memberIds } = JSON.parse(event.body);

    // Obtener info del grupo
    const groupResult = await docClient.send(new QueryCommand({
      TableName: process.env.CHATS_TABLE,
      IndexName: 'UserChatsIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }));

    const groupChat = groupResult.Items?.find(c => c.groupId === groupId);
    if (!groupChat) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Group not found' })
      };
    }

    const existingMembers = groupChat.members || [];
    const newMembers = memberIds.filter(id => !existingMembers.includes(id));
    const updatedMembers = [...existingMembers, ...newMembers];

    // Actualizar todos los registros del grupo con la nueva lista de miembros
    await Promise.all(updatedMembers.map(memberId =>
      docClient.send(new UpdateCommand({
        TableName: process.env.CHATS_TABLE,
        Key: { chatId: `${groupId}#${memberId}` },
        UpdateExpression: 'SET members = :members',
        ExpressionAttributeValues: { ':members': updatedMembers }
      }))
    ));

    // Crear registros para los nuevos miembros
    await Promise.all(newMembers.map(memberId =>
      docClient.send(new PutCommand({
        TableName: process.env.CHATS_TABLE,
        Item: {
          chatId: `${groupId}#${memberId}`,
          userId: memberId,
          groupId: groupId,
          groupName: groupChat.groupName,
          isGroup: true,
          members: updatedMembers,
          lastMessageTime: Date.now(),
          createdAt: new Date().toISOString()
        }
      }))
    ));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, members: updatedMembers })
    };
  } catch (error) {
    console.error('Error adding members:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};

exports.removeMember = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const { groupId, memberId } = event.pathParameters;

    const groupResult = await docClient.send(new QueryCommand({
      TableName: process.env.CHATS_TABLE,
      IndexName: 'UserChatsIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }));

    const groupChat = groupResult.Items?.find(c => c.groupId === groupId);
    if (!groupChat) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Group not found' })
      };
    }

    const existingMembers = groupChat.members || [];
    const updatedMembers = existingMembers.filter(id => id !== memberId);

    await Promise.all(updatedMembers.map(member =>
      docClient.send(new UpdateCommand({
        TableName: process.env.CHATS_TABLE,
        Key: { chatId: `${groupId}#${member}` },
        UpdateExpression: 'SET members = :members',
        ExpressionAttributeValues: { ':members': updatedMembers }
      }))
    ));

    await docClient.send(new UpdateCommand({
      TableName: process.env.CHATS_TABLE,
      Key: { chatId: `${groupId}#${memberId}` },
      UpdateExpression: 'SET members = :members, #removed = :removed',
      ExpressionAttributeNames: { '#removed': 'removed' },
      ExpressionAttributeValues: { 
        ':members': [memberId],
        ':removed': true
      }
    }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, members: updatedMembers })
    };
  } catch (error) {
    console.error('Error removing member:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
