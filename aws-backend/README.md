# WhatsApp Clone - Serverless Backend

## Arquitectura

```
┌─────────────┐
│   Angular   │
│   Frontend  │
└──────┬──────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       ▼                                     ▼
┌──────────────┐                    ┌──────────────┐
│  API Gateway │                    │  WebSocket   │
│   (REST)     │                    │  API Gateway │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       ▼                                   ▼
┌──────────────────────────────────────────────────┐
│         Lambda Functions (Serverless)            │
│  • Login          • Get Chats                    │
│  • Send Message   • Get Messages                 │
│  • Update Status  • WS Connect/Disconnect        │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│              DynamoDB Tables                      │
│  • Users          • Chats                        │
│  • Messages       • MessageStatus                │
│  • Connections                                   │
└──────────────────────────────────────────────────┘
```

## Tablas DynamoDB

### 1. Users Table
```
PK: userId (String)
Attributes:
  - email
  - name
  - avatar
  - online
  - lastSeen
  - createdAt

GSI: EmailIndex (email)
```

### 2. Chats Table
```
PK: chatId (String)
Attributes:
  - participants (List)
  - lastMessage (Map)
  - lastMessageTime (Number)
  - unreadCount (Map)
  - createdAt

GSI: UserChatsIndex (userId, lastMessageTime)
```

### 3. Messages Table
```
PK: messageId (String)
Attributes:
  - chatId
  - senderId
  - content
  - timestamp (Number)
  - status (sent|delivered|read)
  - createdAt

GSI: ChatMessagesIndex (chatId, timestamp)
```

### 4. MessageStatus Table
```
PK: messageId (String)
SK: userId (String)
Attributes:
  - status
  - timestamp
```

### 5. Connections Table
```
PK: connectionId (String)
Attributes:
  - userId
  - connectedAt
  - ttl (Number)

GSI: UserConnectionsIndex (userId)
```

## Instalación

```bash
npm install -g serverless
npm install
```

## Despliegue

```bash
# Desarrollo
npm run deploy:dev

# Producción
npm run deploy:prod

# Custom
serverless deploy --stage staging --region eu-west-1
```

## Desarrollo Local

```bash
npm run offline
```

## Comandos

```bash
# Ver logs
serverless logs -f sendMessage --tail

# Invocar función
serverless invoke -f getChats

# Info
serverless info

# Eliminar
serverless remove
```

## Endpoints

### REST API
```
POST   /auth/login
GET    /chats
POST   /chats
GET    /chats/{chatId}/messages
POST   /chats/{chatId}/messages
PUT    /messages/{messageId}/status
```

### WebSocket
```
$connect
$disconnect
sendMessage
```

## Variables de Entorno

```bash
# Frontend (Angular)
VITE_API_URL=https://xxx.execute-api.us-east-1.amazonaws.com
VITE_WS_URL=wss://xxx.execute-api.us-east-1.amazonaws.com/dev
VITE_USER_POOL_ID=us-east-1_xxxxx
VITE_USER_POOL_CLIENT_ID=xxxxx

# Lambda
USERS_TABLE=dev-users
CHATS_TABLE=dev-chats
MESSAGES_TABLE=dev-messages
MESSAGE_STATUS_TABLE=dev-message-status
CONNECTIONS_TABLE=dev-connections
```

## Flujo de Mensajes

### Enviar Mensaje
1. Frontend → REST API → Lambda send-message
2. Lambda guarda en DynamoDB (Messages)
3. Lambda actualiza Chat (lastMessage)
4. Lambda consulta Connections activas
5. Lambda envía via WebSocket a usuarios conectados

### Actualizar Estado
1. Usuario lee mensaje
2. Frontend → REST API → Lambda update-status
3. Lambda actualiza MessageStatus
4. Lambda actualiza Message.status
5. Lambda notifica via WebSocket al remitente

## Costos Estimados (dev)

```
DynamoDB (PAY_PER_REQUEST):
  - 1M lecturas: $0.25
  - 1M escrituras: $1.25

Lambda:
  - 1M invocaciones: $0.20
  - Compute: ~$0.10

API Gateway:
  - 1M requests: $1.00
  - WebSocket: $1.00

S3:
  - Storage: $0.023/GB
  - Requests: ~$0.01

Total estimado: ~$5-10/mes (uso bajo)
```

## Seguridad

### Cognito
- Autenticación JWT
- Refresh tokens
- MFA opcional

### API Gateway
- Authorizer de Cognito
- Rate limiting
- CORS configurado

### DynamoDB
- Encryption at rest
- Point-in-time recovery
- Backups automáticos

### Lambda
- IAM roles con permisos mínimos
- VPC opcional
- Environment variables encriptadas

## Monitoreo

### CloudWatch
```bash
# Ver logs
aws logs tail /aws/lambda/dev-send-message --follow

# Métricas
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=dev-send-message \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### X-Ray
- Tracing de requests
- Performance analysis
- Error tracking

## Escalabilidad

### DynamoDB
- Auto-scaling habilitado
- On-demand pricing
- Global tables para multi-región

### Lambda
- Concurrency: 1000 por defecto
- Reserved concurrency para funciones críticas
- Provisioned concurrency para baja latencia

### API Gateway
- 10,000 requests/segundo por defecto
- Throttling configurable
- Caching opcional

## Backup y Recuperación

### DynamoDB
```bash
# Backup manual
aws dynamodb create-backup \
  --table-name dev-messages \
  --backup-name messages-backup-$(date +%Y%m%d)

# Restaurar
aws dynamodb restore-table-from-backup \
  --target-table-name dev-messages-restored \
  --backup-arn arn:aws:dynamodb:...
```

### Point-in-Time Recovery
- Habilitado en todas las tablas
- Recuperación hasta 35 días atrás

## Testing

```bash
# Test local
serverless invoke local -f sendMessage -d '{"body":"{\"content\":\"test\"}"}'

# Test API
curl -X POST https://xxx.execute-api.us-east-1.amazonaws.com/dev/chats/123/messages \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"Hello"}'
```

## Estructura

```
src/
├── handlers/
│   ├── auth.js
│   ├── chats.js
│   ├── messages.js
│   └── websocket.js
├── services/
└── utils/
```

## Mejoras Futuras

- [ ] SQS para procesamiento asíncrono
- [ ] SNS para notificaciones push
- [ ] EventBridge para eventos
- [ ] Step Functions para workflows
