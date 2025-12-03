# MyChat - WhatsApp Clone

Aplicación de chat en tiempo real tipo WhatsApp construida con Angular 19.

## 🏗️ Arquitectura

### Standalone Components
- **Por qué**: Más moderno, mejor tree-shaking, menos boilerplate
- **Angular 19**: Usa las últimas features (signals, input/output functions, effects)

### Estructura de Carpetas

```
src/app/
├── core/                    # Servicios globales, guards, interceptors
│   ├── guards/
│   │   └── auth.guard.ts
│   ├── interceptors/
│   │   └── auth.interceptor.ts
│   └── services/
│       ├── auth.service.ts
│       ├── chat.service.ts
│       └── presence.service.ts
├── shared/                  # Componentes reutilizables, pipes
│   ├── components/
│   └── pipes/
│       └── time-ago.pipe.ts
├── features/                # Features por módulo
│   ├── auth/
│   │   └── login.component.ts
│   └── chat/
│       ├── components/
│       │   ├── chat-list.component.ts
│       │   └── chat-detail.component.ts
│       ├── services/
│       └── chat-container.component.ts
└── models/                  # Interfaces y tipos
    ├── user.model.ts
    ├── message.model.ts
    └── chat.model.ts
```

## 🚀 Características

### Implementadas
- ✅ Login con autenticación mock
- ✅ Lista de conversaciones con búsqueda
- ✅ Vista de chat con mensajes
- ✅ Envío de mensajes en tiempo real (simulado)
- ✅ Estados de mensaje: enviado, entregado, leído
- ✅ Indicador de "escribiendo..."
- ✅ Estado online/offline de contactos
- ✅ UI responsive tipo WhatsApp Web
- ✅ Guards para protección de rutas
- ✅ Interceptor HTTP para autenticación
- ✅ Tests unitarios

### Stack Tecnológico
- **Angular 19** - Framework principal
- **Angular Material** - Componentes UI
- **RxJS** - Programación reactiva
- **Signals** - Estado reactivo moderno
- **SCSS** - Estilos
- **TypeScript** - Lenguaje
- **Jasmine/Karma** - Testing

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Instalar Angular CLI globalmente (si no lo tienes)
npm install -g @angular/cli
```

## 🏃 Comandos

```bash
# Desarrollo
npm start
# o
ng serve

# La app estará en http://localhost:4200

# Build producción
npm run build
# o
ng build --configuration production

# Tests
npm test
# o
ng test

# Lint
npm run lint
# o
ng lint
```

## 👤 Usuarios de Prueba

- **Email**: juan@test.com | **Password**: cualquiera
- **Email**: maria@test.com | **Password**: cualquiera

## 🎨 UI/UX

### Características de Diseño
- **Sidebar izquierdo**: Lista de chats con búsqueda
- **Panel principal**: Mensajes y área de escritura
- **Responsive**: Adaptado a móviles y desktop
- **Accesibilidad**: Roles ARIA, labels descriptivos
- **Estados vacíos**: Mensajes amigables cuando no hay chat seleccionado

### Colores
- **Primary**: Indigo (Material)
- **Accent**: Pink
- **WhatsApp Green**: #25d366 (badges, typing indicator)
- **Message Bubbles**: Blanco (recibidos), #dcf8c6 (enviados)

## 🔧 Configuración

### ESLint
Configurado con reglas para TypeScript y Angular:
- Prefijos de componentes: `app-`
- Estilo de selectores: kebab-case
- Warnings para `any`

### Prettier
Configurado con:
- Single quotes
- 2 espacios de indentación
- 100 caracteres por línea

## 🧪 Testing

### Servicios Testeados
- `AuthService`: Login, logout, persistencia
- `ChatService`: Obtener chats, mensajes, enviar mensajes
- `TimeAgoPipe`: Formateo de fechas

### Ejecutar Tests
```bash
npm test
```

## 🔐 Autenticación

### Implementación Actual (Mock)
- Login simulado con usuarios hardcodeados
- Token mock en localStorage
- Guard funcional para proteger rutas
- Interceptor que añade header de autorización

### Para Producción
```typescript
// En auth.service.ts
login(email: string, password: string): Observable<AuthResponse> {
  return this.http.post<AuthResponse>('/api/auth/login', { email, password })
    .pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        this.currentUser.set(response.user);
      })
    );
}

// En auth.interceptor.ts
const token = localStorage.getItem('token');
if (token) {
  req = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
}
```

### Opciones de Backend
- **JWT**: Token-based authentication
- **AWS Cognito**: Servicio de autenticación de AWS
- **Auth0**: Plataforma de autenticación
- **Firebase Auth**: Autenticación de Google

## 💬 Chat en Tiempo Real

### Implementación Actual (Mock)
- BehaviorSubject para estado reactivo
- Simulación de latencia con `delay()`
- Cambios de estado automáticos (sent → delivered → read)
- Indicador de "escribiendo" aleatorio

### Para Producción con WebSocket

```typescript
// Instalar Socket.IO
npm install socket.io-client

// En chat.service.ts
import { io, Socket } from 'socket.io-client';

export class ChatService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3000');
    this.listenToMessages();
  }

  private listenToMessages(): void {
    this.socket.on('message', (message: Message) => {
      const current = this.messagesSubject.value;
      this.messagesSubject.next([...current, message]);
    });

    this.socket.on('typing', ({ chatId, isTyping }) => {
      this.setTyping(chatId, isTyping);
    });
  }

  sendMessage(chatId: string, content: string): void {
    this.socket.emit('message', { chatId, content });
  }

  notifyTyping(chatId: string): void {
    this.socket.emit('typing', { chatId, isTyping: true });
  }
}
```

### Backend con Node.js + Socket.IO

```javascript
// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: 'http://localhost:4200' }
});

io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('message', (data) => {
    // Guardar en BD
    io.emit('message', data); // Broadcast a todos
  });

  socket.on('typing', (data) => {
    socket.broadcast.emit('typing', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## 🗄️ Backend API REST

### Endpoints Necesarios

```typescript
// Auth
POST   /api/auth/login          { email, password } → { token, user }
POST   /api/auth/register       { name, email, password } → { user }
POST   /api/auth/logout         → { success }
GET    /api/auth/me             → { user }

// Chats
GET    /api/chats               → { chats[] }
GET    /api/chats/:id           → { chat }
POST   /api/chats               { participantIds[] } → { chat }
DELETE /api/chats/:id           → { success }

// Messages
GET    /api/chats/:id/messages  → { messages[] }
POST   /api/chats/:id/messages  { content } → { message }
PUT    /api/messages/:id/status { status } → { message }

// Users
GET    /api/users               → { users[] }
GET    /api/users/:id           → { user }
PUT    /api/users/:id           { name, avatar } → { user }
```

### Ejemplo con NestJS

```typescript
// messages.controller.ts
@Controller('chats/:chatId/messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  async getMessages(@Param('chatId') chatId: string) {
    return this.messagesService.findByChatId(chatId);
  }

  @Post()
  async sendMessage(
    @Param('chatId') chatId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: User
  ) {
    return this.messagesService.create(chatId, dto, user.id);
  }
}
```

## 🔒 Seguridad

### Recomendaciones para Producción

1. **Autenticación**
   - Usar JWT con refresh tokens
   - HttpOnly cookies para tokens
   - CSRF protection

2. **Autorización**
   - Verificar permisos en backend
   - Validar que el usuario pertenece al chat

3. **Validación**
   - Sanitizar inputs
   - Validar en frontend y backend
   - Rate limiting

4. **HTTPS**
   - Usar SSL/TLS en producción
   - Secure WebSocket (wss://)

5. **Encriptación**
   - Encriptar mensajes end-to-end (opcional)
   - Usar bcrypt para passwords

## 📱 Responsive Design

La aplicación es responsive:
- **Desktop**: Sidebar + chat lado a lado
- **Mobile**: Vista única, alterna entre lista y chat

## 🚀 Deploy

### Opciones de Hosting

1. **AWS**
   ```bash
   # S3 + CloudFront
   ng build --configuration production
   aws s3 sync dist/my-chat s3://my-bucket
   ```

2. **Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```

3. **Netlify**
   ```bash
   npm run build
   # Drag & drop dist/ folder
   ```

4. **Firebase Hosting**
   ```bash
   npm install -g firebase-tools
   firebase init
   firebase deploy
   ```

## 📚 Recursos

- [Angular Docs](https://angular.dev)
- [Angular Material](https://material.angular.io)
- [RxJS](https://rxjs.dev)
- [Socket.IO](https://socket.io)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/amazing`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing`)
5. Abre un Pull Request

## 📄 Licencia

MIT

---

**Desarrollado con ❤️ usando Angular 19**
