const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.createGroup = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const { name, memberIds, description } = JSON.parse(event.body);

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
          groupDescription: description,
          isGroup: true,
          members: allMembers,
          lastMessageTime: now,
          createdAt: new Date().toISOString()
        }
      }))
    ));

    // Obtener info del creador
    const creatorInfo = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId }
    }));

    const creatorName = creatorInfo.Item?.name || 'Usuario';

    // Crear mensaje de sistema para creación del grupo
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await docClient.send(new PutCommand({
      TableName: process.env.MESSAGES_TABLE,
      Item: {
        messageId,
        chatId: groupId,
        senderId: userId,
        senderName: creatorName,
        content: `${creatorName} creó el grupo`,
        timestamp: now,
        type: 'system',
        systemAction: 'group_created',
        createdAt: new Date().toISOString()
      }
    }));

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

    // Obtener info del usuario que agrega
    const adderInfo = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId }
    }));

    const adderName = adderInfo.Item?.name || 'Usuario';
    const now = Date.now();

    // Crear mensajes de sistema para cada miembro agregado
    await Promise.all(newMembers.map(async (memberId) => {
      const memberInfo = await docClient.send(new GetCommand({
        TableName: process.env.USERS_TABLE,
        Key: { userId: memberId }
      }));

      const memberName = memberInfo.Item?.name || 'Usuario';
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return docClient.send(new PutCommand({
        TableName: process.env.MESSAGES_TABLE,
        Item: {
          messageId,
          chatId: groupId,
          senderId: userId,
          senderName: adderName,
          content: `${adderName} agregó a ${memberName}`,
          timestamp: now,
          type: 'system',
          systemAction: 'member_added',
          affectedUserId: memberId,
          affectedUserName: memberName,
          createdAt: new Date().toISOString()
        }
      }));
    }));

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

    // Obtener info del usuario que elimina y del eliminado
    const removerInfo = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId }
    }));

    const removedInfo = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId: memberId }
    }));

    const removerName = removerInfo.Item?.name || 'Usuario';
    const removedName = removedInfo.Item?.name || 'Usuario';

    // Crear mensaje de sistema
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await docClient.send(new PutCommand({
      TableName: process.env.MESSAGES_TABLE,
      Item: {
        messageId,
        chatId: groupId,
        senderId: userId,
        senderName: removerName,
        content: `${removerName} eliminó a ${removedName}`,
        timestamp: Date.now(),
        type: 'system',
        systemAction: 'member_removed',
        affectedUserId: memberId,
        affectedUserName: removedName,
        createdAt: new Date().toISOString()
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

exports.updateInfo = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const { groupId } = event.pathParameters;
    const { name, description } = JSON.parse(event.body);

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

    const members = groupChat.members || [];
    const updates = [];
    const values = {};

    if (name !== undefined) {
      updates.push('groupName = :name');
      values[':name'] = name;
    }
    if (description !== undefined) {
      updates.push('groupDescription = :desc');
      values[':desc'] = description;
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No fields to update' })
      };
    }

    await Promise.all(members.map(memberId =>
      docClient.send(new UpdateCommand({
        TableName: process.env.CHATS_TABLE,
        Key: { chatId: `${groupId}#${memberId}` },
        UpdateExpression: `SET ${updates.join(', ')}`,
        ExpressionAttributeValues: values
      }))
    ));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error updating group info:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
