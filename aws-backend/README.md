# WhatsApp Clone - Backend API

Backend serverless para aplicación de chat en tiempo real construido con AWS Lambda, DynamoDB, API Gateway y WebSocket.

## 🏗️ Arquitectura

- **Framework**: Serverless Framework v3
- **Runtime**: Node.js 20.x
- **Cloud Provider**: AWS
- **Servicios AWS**:
  - Lambda Functions (13 funciones)
  - DynamoDB (4 tablas)
  - API Gateway (REST + WebSocket)
  - Cognito (Autenticación)

## 📦 Tablas DynamoDB

### UsersTable
- **Partition Key**: `userId` (String)
- **GSI**: EmailIndex (`email`)
- Almacena información de usuarios registrados

### ChatsTable
- **Partition Key**: `chatId` (String)
- **GSI**: UserChatsIndex (`userId`, `lastMessageTime`)
- Almacena conversaciones individuales y grupales

### MessagesTable
- **Partition Key**: `messageId` (String)
- **GSI**: ChatMessagesIndex (`chatId`, `timestamp`)
- Almacena mensajes de texto y sistema

### ConnectionsTable
- **Partition Key**: `connectionId` (String)
- **GSI**: UserConnectionsIndex (`userId`)
- **TTL**: Habilitado
- Almacena conexiones WebSocket activas

## 🚀 Instalación

```bash
npm install
```

## 📝 Variables de Entorno

Las variables se configuran automáticamente en `serverless.yml`:

- `USERS_TABLE`: Tabla de usuarios
- `CHATS_TABLE`: Tabla de chats
- `MESSAGES_TABLE`: Tabla de mensajes
- `CONNECTIONS_TABLE`: Tabla de conexiones WebSocket
- `USER_POOL_CLIENT_ID`: ID del cliente Cognito
- `USER_POOL_ID`: ID del User Pool Cognito

## 🔧 Despliegue

### Desarrollo
```bash
npx serverless deploy
```

### Producción
```bash
npx serverless deploy --stage prod
```

### Desplegar función específica
```bash
npx serverless deploy function -f functionName
```

## 📡 API Endpoints

### Autenticación

#### POST /auth/register
Registra un nuevo usuario.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "name": "John Doe"
}
```

#### POST /auth/login
Inicia sesión de usuario.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "idToken": "id-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST /auth/refresh
Renueva el token de acceso.

**Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response:**
```json
{
  "accessToken": "new-jwt-token",
  "idToken": "new-id-token"
}
```

### Chats

#### GET /chats
Obtiene todos los chats del usuario autenticado.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:**
```json
[
  {
    "id": "chat_uuid1_uuid2",
    "participants": [{
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "JD",
      "online": false
    }],
    "lastMessage": null,
    "unreadCount": 0,
    "isTyping": false
  }
]
```

#### GET /users
Obtiene lista de usuarios disponibles para chat.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:**
```json
[
  {
    "userId": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  }
]
```

### Mensajes

#### GET /chats/{chatId}/messages
Obtiene mensajes de un chat con paginación.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `lastKey` (opcional): Clave para paginación

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_uuid",
      "chatId": "chat_uuid",
      "senderId": "uuid",
      "senderName": "John Doe",
      "senderAvatar": "JD",
      "content": "Hello!",
      "timestamp": 1234567890,
      "status": "sent",
      "type": "text"
    }
  ],
  "lastKey": "base64-encoded-key"
}
```

### Grupos

#### POST /groups
Crea un nuevo grupo.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Body:**
```json
{
  "name": "Family Group",
  "description": "Our family chat",
  "memberIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "id": "group_timestamp_random",
  "groupName": "Family Group",
  "isGroup": true,
  "participants": [],
  "lastMessage": null,
  "unreadCount": 0,
  "isTyping": false
}
```

#### POST /groups/{groupId}/members
Agrega miembros a un grupo.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Body:**
```json
{
  "memberIds": ["uuid3", "uuid4"]
}
```

**Response:**
```json
{
  "success": true,
  "members": ["uuid1", "uuid2", "uuid3", "uuid4"]
}
```

#### DELETE /groups/{groupId}/members/{memberId}
Elimina un miembro del grupo.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "members": ["uuid1", "uuid2"]
}
```

#### PUT /groups/{groupId}/info
Actualiza nombre y/o descripción del grupo.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Body:**
```json
{
  "name": "New Group Name",
  "description": "New description"
}
```

**Response:**
```json
{
  "success": true
}
```

## 🔌 WebSocket API

### Conexión
```
wss://{api-id}.execute-api.{region}.amazonaws.com/{stage}?userId={userId}
```

### Eventos

#### sendMessage
Envía un mensaje a través de WebSocket.

**Payload:**
```json
{
  "action": "sendMessage",
  "recipientId": "uuid",
  "content": "Hello!",
  "senderId": "uuid",
  "chatId": "chat_uuid",
  "isGroup": false
}
```

#### Mensaje recibido
```json
{
  "type": "message",
  "data": {
    "messageId": "msg_uuid",
    "chatId": "chat_uuid",
    "senderId": "uuid",
    "senderName": "John Doe",
    "senderAvatar": "JD",
    "content": "Hello!",
    "timestamp": 1234567890
  }
}
```

## 📊 Tipos de Mensajes

### Mensaje de texto
```json
{
  "type": "text",
  "content": "Hello world"
}
```

### Mensaje de sistema
```json
{
  "type": "system",
  "systemAction": "group_created|member_added|member_removed",
  "content": "User created the group",
  "senderName": "John Doe",
  "affectedUserName": "Jane Doe"
}
```

## 🔒 Autenticación

Todos los endpoints (excepto `/auth/*`) requieren token JWT en el header:

```
Authorization: Bearer {accessToken}
```

Los tokens son generados por AWS Cognito y tienen una duración de 1 hora.

## 🧪 Testing Local

```bash
npx serverless offline
```

## 📈 Monitoreo

- CloudWatch Logs: Logs automáticos de todas las funciones
- CloudWatch Metrics: Métricas de invocaciones, errores y duración
- X-Ray: Tracing distribuido (opcional)

## 🛠️ Estructura del Proyecto

```
aws-backend/
├── src/
│   └── handlers/
│       ├── auth.js          # Autenticación
│       ├── chats.js         # Gestión de chats
│       ├── groups.js        # Gestión de grupos
│       ├── messages.js      # Gestión de mensajes
│       ├── users.js         # Gestión de usuarios
│       └── websocket.js     # WebSocket handlers
├── serverless.yml           # Configuración Serverless
├── package.json
└── README.md
```

## 🔄 Flujo de Mensajería

1. Usuario envía mensaje via WebSocket
2. Lambda `wsMessage` procesa el mensaje
3. Mensaje se guarda en `MessagesTable`
4. Se buscan conexiones activas del destinatario en `ConnectionsTable`
5. Mensaje se envía a conexiones activas via WebSocket
6. Se actualiza `lastMessageTime` en `ChatsTable`

## 💾 Modelo de Datos

### Chat Individual
```
chatId: "chat_{userId1}_{userId2}"
userId: "userId1"
otherUserId: "userId2"
```

### Chat Grupal
```
chatId: "group_{timestamp}_{random}#{userId}"
userId: "userId"
groupId: "group_{timestamp}_{random}"
groupName: "Group Name"
groupDescription: "Description"
members: ["userId1", "userId2", "userId3"]
isGroup: true
```

## 🚨 Manejo de Errores

Todos los endpoints retornan errores en formato:

```json
{
  "error": "Error message"
}
```

Códigos de estado HTTP:
- `200`: Éxito
- `201`: Creado
- `400`: Bad Request
- `401`: No autorizado
- `404`: No encontrado
- `500`: Error del servidor

## 📄 Licencia

MIT
