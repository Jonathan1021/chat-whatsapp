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
          admins: [userId],
          role: memberId === userId ? 'admin' : 'member',
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
        groupDescription: description || '',
        isGroup: true,
        participants: [],
        lastMessage: undefined,
        unreadCount: 0,
        isTyping: false,
        role: 'admin',
        admins: [userId]
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

    // Verificar que el usuario sea admin
    if (groupChat.role !== 'admin') {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Only admins can add members' })
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
          groupDescription: groupChat.groupDescription,
          isGroup: true,
          members: updatedMembers,
          admins: groupChat.admins || [],
          role: 'member',
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

exports.leaveGroup = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const { groupId } = event.pathParameters;

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
    const admins = groupChat.admins || [];
    
    // Si es el único miembro, eliminar el grupo completamente
    if (members.length === 1) {
      await docClient.send(new DeleteCommand({
        TableName: process.env.CHATS_TABLE,
        Key: { chatId: `${groupId}#${userId}` }
      }));

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true, deleted: true })
      };
    }

    // Obtener info del usuario que sale ANTES de eliminarlo
    const userInfo = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId }
    }));

    const userName = userInfo.Item?.name || 'Usuario';

    // Crear mensaje de sistema ANTES de eliminar al usuario
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    const systemMessage = {
      messageId,
      chatId: groupId,
      senderId: userId,
      senderName: userName,
      content: `${userName} salió del grupo`,
      timestamp,
      type: 'system',
      systemAction: 'member_left',
      createdAt: new Date().toISOString()
    };
    
    await docClient.send(new PutCommand({
      TableName: process.env.MESSAGES_TABLE,
      Item: systemMessage
    }));

    // Enviar mensaje via WebSocket a TODOS los miembros (incluyendo el que sale)
    const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
    const domain = event.requestContext.domainName;
    const stage = event.requestContext.stage;
    const apiGateway = new ApiGatewayManagementApiClient({ endpoint: `https://${domain}/${stage}` });

    const allConnections = await Promise.all(
      members.map(memberId => 
        docClient.send(new QueryCommand({
          TableName: process.env.CONNECTIONS_TABLE,
          IndexName: 'UserConnectionsIndex',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': memberId }
        }))
      )
    );

    const messageWithId = { ...systemMessage, id: messageId };
    for (const result of allConnections) {
      for (const connection of result.Items || []) {
        await apiGateway.send(new PostToConnectionCommand({
          ConnectionId: connection.connectionId,
          Data: JSON.stringify({ type: 'message', data: messageWithId })
        })).catch(() => {});
      }
    }

    const updatedMembers = members.filter(id => id !== userId);
    let updatedAdmins = admins;

    // Si es admin y es el único admin, asignar a otro miembro
    if (admins.includes(userId) && admins.length === 1 && updatedMembers.length > 0) {
      updatedAdmins = [updatedMembers[0]];
    } else if (admins.includes(userId)) {
      updatedAdmins = admins.filter(id => id !== userId);
    }

    // Actualizar todos los miembros restantes
    await Promise.all(updatedMembers.map(member =>
      docClient.send(new UpdateCommand({
        TableName: process.env.CHATS_TABLE,
        Key: { chatId: `${groupId}#${member}` },
        UpdateExpression: 'SET members = :members, admins = :admins, #role = :role',
        ExpressionAttributeNames: { '#role': 'role' },
        ExpressionAttributeValues: {
          ':members': updatedMembers,
          ':admins': updatedAdmins,
          ':role': updatedAdmins.includes(member) ? 'admin' : 'member'
        }
      }))
    ));

    // Eliminar el registro del usuario que sale
    await docClient.send(new DeleteCommand({
      TableName: process.env.CHATS_TABLE,
      Key: { chatId: `${groupId}#${userId}` }
    }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, deleted: false })
    };
  } catch (error) {
    console.error('Error leaving group:', error);
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

    // Verificar que el usuario sea admin
    if (groupChat.role !== 'admin') {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Only admins can remove members' })
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

    if (groupChat.role !== 'admin') {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Only admins can update group info' })
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

exports.promoteToAdmin = async (event) => {
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

    if (groupChat.role !== 'admin') {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Only admins can promote members' })
      };
    }

    const admins = groupChat.admins || [];
    if (admins.includes(memberId)) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'User is already admin' })
      };
    }

    const updatedAdmins = [...admins, memberId];
    const members = groupChat.members || [];

    await Promise.all(members.map(member =>
      docClient.send(new UpdateCommand({
        TableName: process.env.CHATS_TABLE,
        Key: { chatId: `${groupId}#${member}` },
        UpdateExpression: 'SET admins = :admins, #role = :role',
        ExpressionAttributeNames: { '#role': 'role' },
        ExpressionAttributeValues: {
          ':admins': updatedAdmins,
          ':role': updatedAdmins.includes(member) ? 'admin' : 'member'
        }
      }))
    ));

    const promoterInfo = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId }
    }));

    const promotedInfo = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId: memberId }
    }));

    const promoterName = promoterInfo.Item?.name || 'Usuario';
    const promotedName = promotedInfo.Item?.name || 'Usuario';

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    const systemMessage = {
      messageId,
      chatId: groupId,
      senderId: userId,
      senderName: promoterName,
      content: `${promoterName} nombró a ${promotedName} administrador`,
      timestamp,
      type: 'system',
      systemAction: 'admin_promoted',
      affectedUserId: memberId,
      affectedUserName: promotedName,
      createdAt: new Date().toISOString()
    };
    
    await docClient.send(new PutCommand({
      TableName: process.env.MESSAGES_TABLE,
      Item: systemMessage
    }));

    // Enviar mensaje via WebSocket
    const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
    const domain = event.requestContext.domainName;
    const stage = event.requestContext.stage;
    const apiGateway = new ApiGatewayManagementApiClient({ endpoint: `https://${domain}/${stage}` });

    const allConnections = await Promise.all(
      members.map(userId => 
        docClient.send(new QueryCommand({
          TableName: process.env.CONNECTIONS_TABLE,
          IndexName: 'UserConnectionsIndex',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId }
        }))
      )
    );

    const messageWithId = { ...systemMessage, id: messageId };
    for (const result of allConnections) {
      for (const connection of result.Items || []) {
        await apiGateway.send(new PostToConnectionCommand({
          ConnectionId: connection.connectionId,
          Data: JSON.stringify({ type: 'message', data: messageWithId })
        })).catch(() => {});
      }
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, admins: updatedAdmins })
    };
  } catch (error) {
    console.error('Error promoting to admin:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};

exports.demoteFromAdmin = async (event) => {
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

    if (groupChat.role !== 'admin') {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Only admins can demote admins' })
      };
    }

    const admins = groupChat.admins || [];
    if (!admins.includes(memberId)) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'User is not an admin' })
      };
    }

    const updatedAdmins = admins.filter(id => id !== memberId);
    const members = groupChat.members || [];

    await Promise.all(members.map(member =>
      docClient.send(new UpdateCommand({
        TableName: process.env.CHATS_TABLE,
        Key: { chatId: `${groupId}#${member}` },
        UpdateExpression: 'SET admins = :admins, #role = :role',
        ExpressionAttributeNames: { '#role': 'role' },
        ExpressionAttributeValues: {
          ':admins': updatedAdmins,
          ':role': updatedAdmins.includes(member) ? 'admin' : 'member'
        }
      }))
    ));

    const demoterInfo = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId }
    }));

    const demotedInfo = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId: memberId }
    }));

    const demoterName = demoterInfo.Item?.name || 'Usuario';
    const demotedName = demotedInfo.Item?.name || 'Usuario';

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    const systemMessage = {
      messageId,
      chatId: groupId,
      senderId: userId,
      senderName: demoterName,
      content: `${demoterName} quitó a ${demotedName} como administrador`,
      timestamp,
      type: 'system',
      systemAction: 'admin_demoted',
      affectedUserId: memberId,
      affectedUserName: demotedName,
      createdAt: new Date().toISOString()
    };
    
    await docClient.send(new PutCommand({
      TableName: process.env.MESSAGES_TABLE,
      Item: systemMessage
    }));

    // Enviar mensaje via WebSocket
    const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
    const domain = event.requestContext.domainName;
    const stage = event.requestContext.stage;
    const apiGateway = new ApiGatewayManagementApiClient({ endpoint: `https://${domain}/${stage}` });

    const allConnections = await Promise.all(
      members.map(userId => 
        docClient.send(new QueryCommand({
          TableName: process.env.CONNECTIONS_TABLE,
          IndexName: 'UserConnectionsIndex',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': userId }
        }))
      )
    );

    const messageWithId = { ...systemMessage, id: messageId };
    for (const result of allConnections) {
      for (const connection of result.Items || []) {
        await apiGateway.send(new PostToConnectionCommand({
          ConnectionId: connection.connectionId,
          Data: JSON.stringify({ type: 'message', data: messageWithId })
        })).catch(() => {});
      }
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, admins: updatedAdmins })
    };
  } catch (error) {
    console.error('Error demoting from admin:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};


