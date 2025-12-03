# WhatsApp Clone - Serverless Backend

## Instalación

```bash
npm install -g serverless
npm install
```

## Despliegue

```bash
# Dev
npm run deploy:dev

# Prod
npm run deploy:prod

# Custom stage/region
serverless deploy --stage staging --region eu-west-1
```

## Desarrollo Local

```bash
npm run offline
```

## Comandos Útiles

```bash
# Ver logs
serverless logs -f sendMessage --tail

# Invocar función
serverless invoke -f getChats --data '{"userId":"123"}'

# Info del stack
serverless info

# Eliminar stack
npm run remove
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
wss://{api-id}.execute-api.{region}.amazonaws.com/{stage}
```

## Variables de Entorno

Configurar en `serverless.yml` o usar `.env`:

```bash
USER_POOL_CLIENT_ID=xxx
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

## Costos

- Lambda: ~$0.20 por 1M requests
- DynamoDB: PAY_PER_REQUEST
- API Gateway: ~$1 por 1M requests
- Total: ~$5-10/mes (uso bajo)
