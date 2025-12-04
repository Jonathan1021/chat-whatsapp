# WhatsApp Clone - Full Stack Application

Aplicación de chat en tiempo real inspirada en WhatsApp Web, construida con Angular 19 y AWS Serverless.

## 📋 Descripción General

Sistema completo de mensajería que incluye:
- Autenticación segura con JWT
- Chat individual y grupal
- Mensajería en tiempo real via WebSocket
- Gestión completa de grupos
- Interfaz moderna estilo WhatsApp Web

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Angular 19)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth       │  │   Chat       │  │  WebSocket   │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / WSS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS API Gateway                           │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │   REST API           │  │   WebSocket API      │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS Lambda Functions                      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │  Auth  │ │ Chats  │ │Messages│ │ Groups │ │   WS   │   │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS DynamoDB                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐          │
│  │ Users  │ │ Chats  │ │Messages│ │Connections │          │
│  └────────┘ └────────┘ └────────┘ └────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS Cognito                               │
│                  (User Authentication)                       │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Tecnologías

### Frontend
- **Framework**: Angular 19
- **UI**: Angular Material
- **State**: RxJS
- **WebSocket**: Native WebSocket API
- **Build**: Angular CLI

### Backend
- **Framework**: Serverless Framework v3
- **Runtime**: Node.js 20.x
- **Cloud**: AWS
  - Lambda (13 funciones)
  - DynamoDB (4 tablas)
  - API Gateway (REST + WebSocket)
  - Cognito (Autenticación)

## 📦 Estructura del Proyecto

```
chat/
├── my-chat/                    # Frontend Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/          # Servicios, guards, interceptors
│   │   │   ├── features/      # Componentes de funcionalidades
│   │   │   ├── models/        # Interfaces TypeScript
│   │   │   └── shared/        # Pipes, utilidades
│   │   └── environments/      # Configuración
│   ├── package.json
│   └── README.md
│
├── aws-backend/               # Backend Serverless
│   ├── src/
│   │   └── handlers/         # Lambda functions
│   │       ├── auth.js
│   │       ├── chats.js
│   │       ├── groups.js
│   │       ├── messages.js
│   │       ├── users.js
│   │       └── websocket.js
│   ├── serverless.yml        # Configuración Serverless
│   ├── swagger.yaml          # Documentación API
│   ├── package.json
│   └── README.md
│
└── README.md                 # Este archivo
```

## 🎯 Características Principales

### ✅ Autenticación
- Registro de usuarios con validación
- Login con JWT tokens
- Refresh token automático
- Sesiones por pestaña (sessionStorage)
- Logout seguro

### ✅ Chat Individual
- Conversaciones 1 a 1
- Mensajes en tiempo real
- Indicador de "escribiendo..."
- Historial de mensajes con paginación
- Contador de mensajes no leídos

### ✅ Chat Grupal
- Crear grupos con nombre y descripción
- Agregar/eliminar miembros
- Editar nombre y descripción del grupo
- Mensajes de sistema (creación, miembros agregados/eliminados)
- Identificación de remitente en mensajes
- Usuarios eliminados pueden ver historial pero no enviar

### ✅ Mensajería
- Envío en tiempo real via WebSocket
- Paginación de mensajes (100 por página)
- Scroll infinito para cargar más
- Emojis con 6 categorías
- Mensajes almacenados por chat en memoria
- Optimistic updates (feedback instantáneo)

### ✅ UI/UX
- Diseño inspirado en WhatsApp Web
- Responsive (desktop, tablet, mobile)
- Loading screen con branding
- Animaciones suaves
- Indicadores visuales claros

## 🔧 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ y npm
- AWS CLI configurado
- Cuenta de AWS

### 1. Clonar Repositorio
```bash
git clone <repository-url>
cd chat
```

### 2. Backend Setup

```bash
cd aws-backend
npm install

# Desplegar a AWS
npx serverless deploy

# Guardar outputs (API URL, WebSocket URL)
```

### 3. Frontend Setup

```bash
cd my-chat
npm install

# Crear archivos de configuración
# Crear src/environments/environment.ts
```

**src/environments/environment.ts**
```typescript
export const environment = {
  production: false,
  apiUrl: 'YOUR_API_GATEWAY_URL',  // Del output de serverless deploy
  wsUrl: 'YOUR_WEBSOCKET_URL',     // Del output de serverless deploy
  cognitoUserPoolId: 'YOUR_USER_POOL_ID',
  cognitoClientId: 'YOUR_CLIENT_ID'
};
```

**src/environments/environment.prod.ts**
```typescript
export const environment = {
  production: true,
  apiUrl: 'YOUR_API_GATEWAY_URL',
  wsUrl: 'YOUR_WEBSOCKET_URL',
  cognitoUserPoolId: 'YOUR_USER_POOL_ID',
  cognitoClientId: 'YOUR_CLIENT_ID'
};
```

```bash
# Desarrollo
npm start

# Build producción
npm run build
```

## 📚 Documentación Detallada

- **Frontend**: Ver [my-chat/README.md](./my-chat/README.md)
- **Backend**: Ver [aws-backend/README.md](./aws-backend/README.md)
- **API Swagger**: Ver [aws-backend/swagger.yaml](./aws-backend/swagger.yaml)

## 🔐 Seguridad

- Autenticación con AWS Cognito
- Tokens JWT con expiración
- Refresh tokens para renovación automática
- HTTPS para todas las comunicaciones
- WSS (WebSocket Secure) para mensajería
- Validación de permisos en backend
- Sanitización de inputs

## 📊 Base de Datos

### DynamoDB Tables

**UsersTable**
- Almacena usuarios registrados
- GSI por email

**ChatsTable**
- Conversaciones individuales y grupales
- GSI por userId y lastMessageTime

**MessagesTable**
- Mensajes de texto y sistema
- GSI por chatId y timestamp

**ConnectionsTable**
- Conexiones WebSocket activas
- GSI por userId
- TTL habilitado

## 🔄 Flujos Principales

### Registro y Login
1. Usuario se registra en `/auth/register`
2. Cognito crea usuario y confirma email
3. Usuario hace login en `/auth/login`
4. Backend retorna tokens JWT
5. Frontend guarda tokens en sessionStorage
6. Usuario redirigido a `/chat`

### Envío de Mensaje
1. Usuario escribe mensaje en input
2. Frontend agrega mensaje localmente (optimistic)
3. Mensaje enviado via WebSocket
4. Backend guarda en DynamoDB
5. Backend busca conexiones activas del destinatario
6. Mensaje enviado a destinatarios via WebSocket
7. Destinatarios reciben y muestran mensaje

### Creación de Grupo
1. Usuario abre diálogo "Nuevo grupo"
2. Ingresa nombre, descripción y selecciona miembros
3. Frontend llama `POST /groups`
4. Backend crea registros en ChatsTable para cada miembro
5. Backend crea mensaje de sistema "Usuario creó el grupo"
6. Frontend recarga lista de chats
7. Grupo aparece en sidebar

## 🧪 Testing

### Frontend
```bash
cd my-chat
npm test
```

### Backend
```bash
cd aws-backend
npm test
```

## 🚀 Deployment

### Backend
```bash
cd aws-backend
npx serverless deploy --stage prod
```

### Frontend
```bash
cd my-chat
npm run build -- --configuration production

# Deploy a S3
aws s3 sync dist/my-chat s3://your-bucket-name

# Invalidar CloudFront
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

## 📈 Monitoreo

- **CloudWatch Logs**: Logs de Lambda functions
- **CloudWatch Metrics**: Métricas de invocaciones y errores
- **DynamoDB Metrics**: Throughput y latencia
- **API Gateway Metrics**: Requests y latencia

## 🐛 Troubleshooting

### WebSocket no conecta
- Verificar URL de WebSocket en environment
- Verificar userId en query string
- Revisar CloudWatch logs de wsConnect

### Mensajes no llegan
- Verificar conexión WebSocket activa
- Revisar CloudWatch logs de wsMessage
- Verificar registros en ConnectionsTable

### 401 Unauthorized
- Verificar token no expirado
- Verificar header Authorization
- Intentar refresh token

## 🔮 Roadmap

- [ ] Envío de imágenes y archivos
- [ ] Mensajes de voz
- [ ] Videollamadas (WebRTC)
- [ ] Estados/Stories
- [ ] Tema oscuro
- [ ] Búsqueda de mensajes
- [ ] Editar/Eliminar mensajes
- [ ] Reacciones a mensajes
- [ ] Notificaciones push
- [ ] PWA support
- [ ] Cifrado end-to-end

## 👥 Contribución

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver archivo LICENSE para detalles

## 📞 Contacto

- Email: support@example.com
- GitHub: [repository-url]

## 🙏 Agradecimientos

- Inspirado en WhatsApp Web
- Angular Team
- AWS Serverless Team
- Material Design Team
