# 🚀 Guía de Producción

## Migración de Mock a Backend Real

### 1. Backend REST API

#### Configurar Environment

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:3000'
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.mychat.com/api',
  wsUrl: 'wss://api.mychat.com'
};
```

#### Actualizar AuthService

```typescript
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  currentUser = signal<User | null>(null);

  constructor(private http: HttpClient) {
    this.loadUserFromToken();
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap(response => {
          // Guardar token JWT
          localStorage.setItem('token', response.token);
          this.currentUser.set(response.user);
        }),
        map(response => response.user)
      );
  }

  private loadUserFromToken(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Decodificar JWT o hacer petición al backend
    this.http.get<User>(`${this.apiUrl}/auth/me`).subscribe({
      next: user => this.currentUser.set(user),
      error: () => this.logout()
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
```

#### Actualizar ChatService

```typescript
@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = environment.apiUrl;
  private chatsSubject = new BehaviorSubject<Chat[]>([]);
  private messagesSubject = new BehaviorSubject<Message[]>([]);

  chats$ = this.chatsSubject.asObservable();
  messages$ = this.messagesSubject.asObservable();

  constructor(private http: HttpClient) {}

  getChats(): Observable<Chat[]> {
    return this.http.get<Chat[]>(`${this.apiUrl}/chats`).pipe(
      tap(chats => this.chatsSubject.next(chats))
    );
  }

  getMessages(chatId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/chats/${chatId}/messages`).pipe(
      tap(messages => this.messagesSubject.next(messages))
    );
  }

  sendMessage(chatId: string, content: string, senderId: string): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/chats/${chatId}/messages`, {
      content,
      senderId
    }).pipe(
      tap(message => {
        const current = this.messagesSubject.value;
        this.messagesSubject.next([...current, message]);
      })
    );
  }

  updateMessageStatus(messageId: string, status: MessageStatus): Observable<Message> {
    return this.http.put<Message>(`${this.apiUrl}/messages/${messageId}/status`, { status });
  }
}
```

### 2. WebSocket para Tiempo Real

#### Instalar Socket.IO Client

```bash
npm install socket.io-client
npm install -D @types/socket.io-client
```

#### Crear WebSocketService

```typescript
// src/app/core/services/websocket.service.ts
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(environment.wsUrl, {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  }

  // Escuchar eventos
  on<T>(event: string): Observable<T> {
    return new Observable(observer => {
      this.socket.on(event, (data: T) => {
        observer.next(data);
      });

      return () => this.socket.off(event);
    });
  }

  // Emitir eventos
  emit(event: string, data: any): void {
    this.socket.emit(event, data);
  }

  // Desconectar
  disconnect(): void {
    this.socket.disconnect();
  }
}
```

#### Actualizar ChatService con WebSocket

```typescript
@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = environment.apiUrl;
  private chatsSubject = new BehaviorSubject<Chat[]>([]);
  private messagesSubject = new BehaviorSubject<Message[]>([]);

  chats$ = this.chatsSubject.asObservable();
  messages$ = this.messagesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private ws: WebSocketService
  ) {
    this.listenToWebSocket();
  }

  private listenToWebSocket(): void {
    // Escuchar nuevos mensajes
    this.ws.on<Message>('message:new').subscribe(message => {
      const current = this.messagesSubject.value;
      this.messagesSubject.next([...current, message]);
    });

    // Escuchar cambios de estado
    this.ws.on<{ messageId: string; status: MessageStatus }>('message:status').subscribe(
      ({ messageId, status }) => {
        const messages = this.messagesSubject.value.map(m =>
          m.id === messageId ? { ...m, status } : m
        );
        this.messagesSubject.next(messages);
      }
    );

    // Escuchar typing
    this.ws.on<{ chatId: string; isTyping: boolean }>('user:typing').subscribe(
      ({ chatId, isTyping }) => {
        const chats = this.chatsSubject.value.map(c =>
          c.id === chatId ? { ...c, isTyping } : c
        );
        this.chatsSubject.next(chats);
      }
    );
  }

  sendMessage(chatId: string, content: string, senderId: string): Observable<Message> {
    // Enviar por HTTP primero (persistencia)
    return this.http.post<Message>(`${this.apiUrl}/chats/${chatId}/messages`, {
      content,
      senderId
    }).pipe(
      tap(message => {
        // Emitir por WebSocket para tiempo real
        this.ws.emit('message:send', message);
      })
    );
  }

  notifyTyping(chatId: string, isTyping: boolean): void {
    this.ws.emit('user:typing', { chatId, isTyping });
  }
}
```

### 3. Backend con Node.js + Express + Socket.IO

#### Estructura del Backend

```
backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── chats.controller.ts
│   │   └── messages.controller.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Chat.ts
│   │   └── Message.ts
│   ├── middleware/
│   │   └── auth.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── chats.routes.ts
│   │   └── messages.routes.ts
│   ├── services/
│   │   └── websocket.service.ts
│   └── server.ts
├── package.json
└── tsconfig.json
```

#### server.ts

```typescript
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { authRouter } from './routes/auth.routes';
import { chatsRouter } from './routes/chats.routes';
import { setupWebSocket } from './services/websocket.service';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:4200',
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/chats', chatsRouter);

// WebSocket
setupWebSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### websocket.service.ts

```typescript
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

export function setupWebSocket(io: Server) {
  // Middleware de autenticación
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.data.user.id);

    // Unirse a rooms de chats del usuario
    const userChats = getUserChats(socket.data.user.id);
    userChats.forEach(chatId => socket.join(chatId));

    // Escuchar mensajes
    socket.on('message:send', async (message) => {
      // Guardar en BD
      const savedMessage = await saveMessage(message);
      
      // Broadcast a todos en el chat
      io.to(message.chatId).emit('message:new', savedMessage);
      
      // Actualizar estado a 'delivered'
      setTimeout(() => {
        io.to(message.chatId).emit('message:status', {
          messageId: savedMessage.id,
          status: 'delivered'
        });
      }, 1000);
    });

    // Escuchar typing
    socket.on('user:typing', ({ chatId, isTyping }) => {
      socket.to(chatId).emit('user:typing', {
        chatId,
        userId: socket.data.user.id,
        isTyping
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.data.user.id);
    });
  });
}
```

#### auth.controller.ts

```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  try {
    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verificar password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generar JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        online: true
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
}
```

### 4. Base de Datos

#### Opción 1: MongoDB + Mongoose

```typescript
// models/Message.ts
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chatId: { type: String, required: true, index: true },
  senderId: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  timestamp: { type: Date, default: Date.now }
});

export const Message = mongoose.model('Message', messageSchema);
```

#### Opción 2: PostgreSQL + Prisma

```prisma
// schema.prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  avatar    String
  password  String
  online    Boolean  @default(false)
  lastSeen  DateTime?
  messages  Message[]
  chats     ChatParticipant[]
}

model Chat {
  id           String   @id @default(uuid())
  participants ChatParticipant[]
  messages     Message[]
  createdAt    DateTime @default(now())
}

model Message {
  id        String   @id @default(uuid())
  chatId    String
  chat      Chat     @relation(fields: [chatId], references: [id])
  senderId  String
  sender    User     @relation(fields: [senderId], references: [id])
  content   String
  status    MessageStatus @default(SENT)
  timestamp DateTime @default(now())
}

enum MessageStatus {
  SENT
  DELIVERED
  READ
}
```

### 5. Autenticación con AWS Cognito

```typescript
// Instalar AWS SDK
npm install @aws-sdk/client-cognito-identity-provider

// auth.service.ts
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private cognitoClient = new CognitoIdentityProviderClient({
    region: 'us-east-1'
  });

  async login(email: string, password: string): Promise<User> {
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: environment.cognitoClientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    });

    const response = await this.cognitoClient.send(command);
    const token = response.AuthenticationResult?.IdToken;

    // Guardar token
    localStorage.setItem('token', token!);

    // Decodificar token para obtener usuario
    const user = this.decodeToken(token!);
    this.currentUser.set(user);

    return user;
  }
}
```

### 6. Deploy

#### Frontend (Vercel)

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel

# Configurar variables de entorno en Vercel dashboard
# VITE_API_URL=https://api.mychat.com
```

#### Backend (Railway / Render / AWS)

```bash
# Railway
railway login
railway init
railway up

# Render
# Conectar repo de GitHub
# Configurar build command: npm run build
# Configurar start command: npm start

# AWS Elastic Beanstalk
eb init
eb create
eb deploy
```

### 7. CI/CD con GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:headless
      - run: npm run build:prod

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build:prod
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend && npm ci
      - run: cd backend && npm run build
      - uses: railway-deploy@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
```

### 8. Monitoreo

#### Sentry para Error Tracking

```typescript
// main.ts
import * as Sentry from "@sentry/angular";

Sentry.init({
  dsn: "https://your-dsn@sentry.io/project-id",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler(),
    },
    // ...
  ]
};
```

### 9. Performance

#### Lazy Loading de Imágenes

```typescript
// image-lazy.directive.ts
@Directive({
  selector: 'img[appLazyLoad]',
  standalone: true
})
export class LazyLoadDirective implements OnInit {
  @Input() src!: string;

  constructor(private el: ElementRef<HTMLImageElement>) {}

  ngOnInit() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.el.nativeElement.src = this.src;
          observer.disconnect();
        }
      });
    });

    observer.observe(this.el.nativeElement);
  }
}
```

#### Service Worker para PWA

```bash
ng add @angular/pwa

# Genera:
# - ngsw-config.json
# - manifest.webmanifest
# - Service worker
```

### 10. Seguridad

#### Content Security Policy

```typescript
// index.html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               connect-src 'self' https://api.mychat.com wss://api.mychat.com;">
```

#### Rate Limiting en Backend

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 requests por ventana
});

app.use('/api/', limiter);
```

## Checklist de Producción

- [ ] Variables de entorno configuradas
- [ ] HTTPS habilitado
- [ ] CORS configurado correctamente
- [ ] Rate limiting implementado
- [ ] Logging y monitoreo activo
- [ ] Error tracking (Sentry)
- [ ] Analytics configurado
- [ ] Tests pasando (unit + e2e)
- [ ] Performance optimizada (Lighthouse > 90)
- [ ] Accesibilidad verificada (WCAG 2.1)
- [ ] SEO optimizado
- [ ] PWA configurado
- [ ] CI/CD pipeline funcionando
- [ ] Backups de base de datos
- [ ] Documentación actualizada
- [ ] Términos de servicio y privacidad

¡Listo para producción! 🚀
