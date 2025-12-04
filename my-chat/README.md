# WhatsApp Clone - Frontend

Aplicación de chat en tiempo real construida con Angular 19, inspirada en WhatsApp Web.

## 🎨 Características

- ✅ Autenticación con JWT (Cognito)
- ✅ Chat individual y grupal
- ✅ Mensajería en tiempo real (WebSocket)
- ✅ Paginación de mensajes (100 por página)
- ✅ Contador de mensajes no leídos
- ✅ Indicador de "escribiendo..."
- ✅ Emojis con categorías
- ✅ Gestión de grupos (crear, agregar/eliminar miembros)
- ✅ Editar nombre y descripción de grupos
- ✅ Mensajes de sistema (creación, miembros agregados/eliminados)
- ✅ Usuarios eliminados pueden ver historial pero no enviar mensajes
- ✅ Refresh token automático
- ✅ Sesiones por pestaña (sessionStorage)
- ✅ UI/UX estilo WhatsApp Web

## 🚀 Tecnologías

- **Framework**: Angular 19
- **UI Components**: Angular Material
- **State Management**: RxJS (BehaviorSubject)
- **HTTP Client**: Angular HttpClient
- **WebSocket**: Native WebSocket API
- **Styling**: CSS (Component-scoped)
- **Build Tool**: Angular CLI

## 📦 Instalación

```bash
npm install
```

## 🔧 Configuración

Edita `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'https://your-api-gateway-url.amazonaws.com/dev',
  wsUrl: 'wss://your-websocket-url.amazonaws.com/dev'
};
```

## 🏃 Desarrollo

```bash
npm start
```

Navega a `http://localhost:4200/`

## 🏗️ Build

```bash
npm run build
```

Los archivos de build se generan en `dist/`

## 📁 Estructura del Proyecto

```
my-chat/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── auth.interceptor.ts
│   │   │   │   └── token.interceptor.ts
│   │   │   └── services/
│   │   │       ├── auth.service.ts
│   │   │       ├── chat.service.ts
│   │   │       └── websocket.service.ts
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── login.component.ts
│   │   │   │   └── register.component.ts
│   │   │   └── chat/
│   │   │       ├── chat-container.component.ts
│   │   │       └── components/
│   │   │           ├── chat-list.component.ts
│   │   │           ├── chat-detail.component.ts
│   │   │           ├── new-chat-dialog.component.ts
│   │   │           ├── new-group-dialog.component.ts
│   │   │           ├── add-members-dialog.component.ts
│   │   │           ├── remove-member-dialog.component.ts
│   │   │           └── group-info-dialog.component.ts
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   ├── chat.model.ts
│   │   │   └── message.model.ts
│   │   ├── shared/
│   │   │   └── pipes/
│   │   │       └── time-ago.pipe.ts
│   │   └── app.routes.ts
│   └── environments/
│       ├── environment.ts
│       └── environment.prod.ts
└── README.md
```

## 🔐 Servicios

### AuthService

Gestiona autenticación y sesiones de usuario.

**Métodos principales:**
- `login(email, password)`: Inicia sesión
- `register(email, password, name)`: Registra usuario
- `logout()`: Cierra sesión
- `refreshToken()`: Renueva token
- `currentUser()`: Signal con usuario actual

**Almacenamiento:**
- `sessionStorage`: Tokens y usuario (por pestaña)

### ChatService

Gestiona chats, mensajes y grupos.

**Métodos principales:**
- `getChats()`: Obtiene lista de chats
- `getMessages(chatId, loadMore?)`: Obtiene mensajes con paginación
- `getUsers()`: Obtiene usuarios disponibles
- `createGroup(name, memberIds, description?)`: Crea grupo
- `addGroupMembers(groupId, memberIds)`: Agrega miembros
- `removeGroupMember(groupId, memberId)`: Elimina miembro
- `updateGroupInfo(groupId, name?, description?)`: Actualiza grupo
- `addMessageLocally(message)`: Agrega mensaje localmente
- `setCurrentChat(chatId)`: Cambia chat activo

**Observables:**
- `chats$`: Lista de chats
- `messages$`: Mensajes del chat activo

**Caché:**
- Mensajes almacenados por chat en memoria
- Usuarios cacheados después de primera carga

### WebSocketService

Gestiona conexión WebSocket para mensajería en tiempo real.

**Métodos principales:**
- `connect(userId)`: Conecta WebSocket
- `disconnect()`: Desconecta WebSocket
- `sendMessage(recipientId, content, senderId, chatId?, isGroup?)`: Envía mensaje

**Observables:**
- `messages$`: Stream de mensajes recibidos

**Características:**
- Reconexión manual (no automática)
- Logging detallado
- Manejo de errores

## 🎨 Componentes

### ChatContainerComponent

Contenedor principal con sidebar y área de chat.

**Features:**
- Loading screen con branding WhatsApp
- Carga paralela de usuarios y chats
- Auto-selección del primer chat
- Gestión de conexión WebSocket

### ChatListComponent

Lista de conversaciones en el sidebar.

**Features:**
- Búsqueda de chats
- Badge de mensajes no leídos
- Indicador de "escribiendo..."
- Botones para nuevo chat/grupo
- Diferenciación visual de grupos

### ChatDetailComponent

Vista de conversación con mensajes.

**Features:**
- Header con info de contacto/grupo
- Área de mensajes con scroll infinito
- Mensajes de sistema diferenciados
- Emoji picker con 6 categorías
- Input bloqueado para usuarios eliminados
- Menú contextual para grupos

### NewGroupDialogComponent

Diálogo para crear grupos.

**Features:**
- Input de nombre (requerido)
- Textarea de descripción (opcional, 200 chars)
- Selección múltiple de miembros
- Validación antes de crear

### GroupInfoDialogComponent

Diálogo de información del grupo.

**Features:**
- Edición de nombre (50 chars)
- Edición de descripción (200 chars)
- Lista de participantes
- Guardado solo de campos modificados

### AddMembersDialogComponent

Diálogo para agregar miembros a grupo.

**Features:**
- Filtrado de usuarios ya en el grupo
- Selección múltiple con checkboxes

### RemoveMemberDialogComponent

Diálogo para eliminar miembros del grupo.

**Features:**
- Lista de miembros actuales
- Click para seleccionar y eliminar

## 🔄 Flujo de Datos

### Autenticación
1. Usuario ingresa credenciales
2. `AuthService.login()` llama API
3. Tokens guardados en sessionStorage
4. Usuario redirigido a `/chat`
5. `AuthGuard` protege rutas

### Envío de Mensaje
1. Usuario escribe mensaje
2. Mensaje agregado localmente (optimistic update)
3. `WebSocketService.sendMessage()` envía via WS
4. Backend procesa y distribuye
5. Destinatarios reciben via WS
6. `ChatService.addMessageLocally()` agrega mensaje

### Carga de Mensajes
1. Usuario selecciona chat
2. `ChatService.setCurrentChat()` cambia chat activo
3. Si no hay mensajes cargados, llama `getMessages()`
4. Mensajes almacenados en `messagesByChat` Map
5. Observable `messages$` emite mensajes

### Paginación
1. Usuario hace scroll al tope
2. `onScroll()` detecta scroll top
3. `getMessages(chatId, true)` con lastKey
4. Nuevos mensajes agregados al inicio
5. Scroll ajustado para mantener posición

## 🎭 Modelos

### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  online: boolean;
  lastSeen?: Date;
}
```

### Chat
```typescript
interface Chat {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isTyping: boolean;
  isGroup?: boolean;
  groupName?: string;
  groupDescription?: string;
  removed?: boolean;
}
```

### Message
```typescript
interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  senderName?: string;
  senderAvatar?: string;
  type?: 'text' | 'system';
  systemAction?: 'group_created' | 'member_added' | 'member_removed';
  affectedUserId?: string;
  affectedUserName?: string;
}
```

## 🔒 Guards e Interceptors

### AuthGuard
Protege rutas que requieren autenticación.

```typescript
canActivate(): boolean {
  if (this.authService.isAuthenticated()) {
    return true;
  }
  this.router.navigate(['/login']);
  return false;
}
```

### AuthInterceptor
Agrega token JWT a requests y maneja 401.

```typescript
intercept(req, next) {
  const token = this.authService.getAccessToken();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next.handle(req);
}
```

### TokenInterceptor
Renueva token automáticamente en 401.

```typescript
intercept(req, next) {
  return next.handle(req).pipe(
    catchError(error => {
      if (error.status === 401 && !req.url.includes('/auth/refresh')) {
        return this.authService.refreshToken().pipe(
          switchMap(() => next.handle(this.addToken(req)))
        );
      }
      return throwError(error);
    })
  );
}
```

## 🎨 Estilos

- **Paleta de colores**: WhatsApp oficial
  - Primary: `#00a884`
  - Background: `#efeae2`
  - Sidebar: `#f0f2f5`
  - Message bubble: `#d9fdd3` (outgoing), `#ffffff` (incoming)

- **Tipografía**: Segoe UI, Helvetica, Arial
- **Iconos**: Material Icons
- **Animaciones**: CSS transitions y keyframes

## 📱 Responsive

- Desktop: Sidebar + Chat (lado a lado)
- Tablet: Sidebar colapsable
- Mobile: Vista única (lista o chat)

## 🧪 Testing

```bash
npm test
```

## 🚀 Deployment

### Build de producción
```bash
npm run build -- --configuration production
```

### Deploy a S3 + CloudFront
```bash
aws s3 sync dist/my-chat s3://your-bucket-name
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## 🐛 Debugging

- Chrome DevTools: Network tab para API calls
- WebSocket frames en Network tab
- Console logs en servicios
- Angular DevTools extension

## 📈 Performance

- Lazy loading de rutas
- OnPush change detection (donde aplique)
- Virtual scrolling para listas largas (futuro)
- Caché de usuarios y mensajes
- Optimistic updates

## 🔮 Futuras Mejoras

- [ ] Envío de imágenes/archivos
- [ ] Mensajes de voz
- [ ] Videollamadas
- [ ] Estados/Stories
- [ ] Tema oscuro
- [ ] Búsqueda de mensajes
- [ ] Editar/Eliminar mensajes
- [ ] Reacciones a mensajes
- [ ] Notificaciones push
- [ ] PWA support

## 📄 Licencia

MIT
