# 🏗️ Arquitectura de MyChat

## Decisiones de Diseño

### 1. Standalone Components (Angular 19)

**Por qué:**
- ✅ Menos boilerplate (no NgModules)
- ✅ Mejor tree-shaking → bundles más pequeños
- ✅ Lazy loading más simple
- ✅ Recomendación oficial de Angular desde v14+
- ✅ Futuro de Angular

**Ejemplo:**
```typescript
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, MatCardModule], // Imports directos
  template: `...`
})
export class LoginComponent {}
```

### 2. Signals + RxJS (Híbrido)

**Signals para:**
- Estado local de componentes
- Valores que cambian frecuentemente
- Mejor performance (change detection granular)

**RxJS para:**
- Operaciones asíncronas (HTTP, WebSocket)
- Streams de datos complejos
- Composición de observables

**Ejemplo:**
```typescript
export class AuthService {
  // Signal para estado reactivo
  currentUser = signal<User | null>(null);
  
  // Observable para operaciones async
  login(email: string): Observable<User> {
    return this.http.post<User>('/api/login', {email})
      .pipe(tap(user => this.currentUser.set(user)));
  }
}
```

### 3. Guards e Interceptors Funcionales

**Por qué:**
- Más simple que clases
- Mejor composición
- Inyección de dependencias con `inject()`

**Ejemplo:**
```typescript
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  return authService.isAuthenticated() || inject(Router).createUrlTree(['/login']);
};
```

### 4. Angular Material

**Por qué:**
- ✅ Componentes oficiales de Angular
- ✅ Accesibilidad integrada (ARIA)
- ✅ Theming potente
- ✅ Responsive out-of-the-box
- ✅ Bien mantenido

**Alternativas consideradas:**
- PrimeNG: Más componentes pero más pesado
- Ng-Bootstrap: Basado en Bootstrap
- Tailwind + HeadlessUI: Más flexible pero más trabajo

## Principios SOLID Aplicados

### 1. Single Responsibility Principle (SRP)
Cada servicio tiene una responsabilidad única:
- `AuthService`: Solo autenticación
- `ChatService`: Solo gestión de chats y mensajes
- `PresenceService`: Solo estado de presencia

### 2. Open/Closed Principle (OCP)
Los servicios son extensibles sin modificar código existente:
```typescript
// Fácil extender con nuevos métodos sin romper existentes
class ChatService {
  getChats() { /* ... */ }
  // Nuevo método no afecta a los existentes
  getChatsByUser(userId: string) { /* ... */ }
}
```

### 3. Dependency Inversion Principle (DIP)
Dependemos de abstracciones (interfaces) no de implementaciones:
```typescript
// Modelos definen contratos
interface Message {
  id: string;
  content: string;
  // ...
}

// Servicios dependen de interfaces, no de clases concretas
```

### 4. Interface Segregation Principle (ISP)
Interfaces pequeñas y específicas:
```typescript
interface User { /* campos de usuario */ }
interface Message { /* campos de mensaje */ }
interface Chat { /* campos de chat */ }
// No una interfaz gigante con todo
```

## Patrones de Diseño

### 1. Service Pattern
Servicios singleton para lógica de negocio:
```typescript
@Injectable({ providedIn: 'root' })
export class ChatService { /* ... */ }
```

### 2. Observer Pattern (RxJS)
Para comunicación reactiva:
```typescript
private chatsSubject = new BehaviorSubject<Chat[]>([]);
chats$ = this.chatsSubject.asObservable();
```

### 3. Guard Pattern
Para protección de rutas:
```typescript
{
  path: 'chats',
  canActivate: [authGuard],
  loadComponent: () => import('./chat-container.component')
}
```

### 4. Interceptor Pattern
Para cross-cutting concerns (auth, logging):
```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getToken();
  return next(req.clone({ setHeaders: { Authorization: token } }));
};
```

## Estructura de Datos

### Flujo de Datos

```
┌─────────────┐
│   Backend   │ (Mock / Real API)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Services   │ (ChatService, AuthService)
│ BehaviorSubj│
└──────┬──────┘
       │
       ↓ Observable
┌─────────────┐
│ Components  │ (ChatList, ChatDetail)
│   + Signals │
└──────┬──────┘
       │
       ↓ async pipe
┌─────────────┐
│  Templates  │ (HTML)
└─────────────┘
```

### Estado Reactivo

```typescript
// Service mantiene estado
private messagesSubject = new BehaviorSubject<Message[]>([]);
messages$ = this.messagesSubject.asObservable();

// Componente consume con async pipe
messages$ = this.chatService.messages$;

// Template se actualiza automáticamente
@for (message of messages$ | async; track message.id) {
  <div>{{ message.content }}</div>
}
```

## Clean Code Aplicado

### 1. Nombres Descriptivos
```typescript
// ❌ Mal
const d = new Date();
function get() { /* ... */ }

// ✅ Bien
const currentTimestamp = new Date();
function getMessagesByChatId(chatId: string) { /* ... */ }
```

### 2. Funciones Pequeñas
```typescript
// Cada función hace una cosa
sendMessage(chatId: string, content: string): Observable<Message> {
  const message = this.createMessage(chatId, content);
  return this.saveMessage(message);
}
```

### 3. Comentarios Útiles
```typescript
/**
 * Enviar mensaje
 * PRODUCCIÓN: Conectar con WebSocket real
 * socket.emit('message', {chatId, content})
 */
sendMessage(chatId: string, content: string) { /* ... */ }
```

### 4. DRY (Don't Repeat Yourself)
```typescript
// Pipe reutilizable para formateo de fechas
@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  transform(value: Date): string { /* ... */ }
}

// Usado en múltiples componentes
{{ message.timestamp | timeAgo }}
```

## Testing Strategy

### Unit Tests
- **Servicios**: Lógica de negocio
- **Pipes**: Transformaciones
- **Guards**: Lógica de autorización

### Integration Tests (futuro)
- Flujos completos de usuario
- Interacción entre componentes

### E2E Tests (futuro)
- Cypress o Playwright
- Flujos críticos (login, enviar mensaje)

## Performance

### Optimizaciones Implementadas

1. **Lazy Loading**
```typescript
{
  path: 'chats',
  loadComponent: () => import('./chat-container.component')
}
```

2. **OnPush Change Detection** (futuro)
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

3. **TrackBy en ngFor**
```typescript
@for (chat of chats; track chat.id) { /* ... */ }
```

4. **Async Pipe**
```typescript
// Evita memory leaks, auto-unsubscribe
{{ messages$ | async }}
```

## Seguridad

### Implementado
- ✅ Guards para rutas protegidas
- ✅ Interceptor para tokens
- ✅ Sanitización automática de Angular

### Para Producción
- 🔒 HTTPS obligatorio
- 🔒 JWT con refresh tokens
- 🔒 Rate limiting
- 🔒 Input validation en backend
- 🔒 CORS configurado correctamente
- 🔒 CSP headers
- 🔒 XSS protection

## Escalabilidad

### Actual (Mock)
- ✅ Datos en memoria
- ✅ BehaviorSubject para estado
- ✅ Simulación de tiempo real

### Producción
```typescript
// 1. Backend REST API
this.http.get<Chat[]>('/api/chats')

// 2. WebSocket para tiempo real
this.socket.on('message', (msg) => { /* ... */ })

// 3. State Management (NgRx/Akita) si crece
store.select(selectChats)

// 4. Paginación
getMessages(chatId: string, page: number, limit: number)

// 5. Caching
@Injectable({ providedIn: 'root' })
export class CacheService { /* ... */ }
```

## Accesibilidad (A11y)

### Implementado
- ✅ Roles ARIA en listas
- ✅ Labels en inputs
- ✅ Navegación por teclado (Material)
- ✅ Contraste de colores adecuado

### Mejoras Futuras
- 🎯 Screen reader testing
- 🎯 Focus management
- 🎯 Keyboard shortcuts
- 🎯 ARIA live regions para mensajes nuevos

## Internacionalización (i18n)

### Para Implementar
```typescript
// 1. Instalar
npm install @angular/localize

// 2. Marcar textos
<h1 i18n="@@welcome">Bienvenido</h1>

// 3. Extraer
ng extract-i18n

// 4. Traducir
// messages.es.xlf, messages.en.xlf

// 5. Build por idioma
ng build --localize
```

## Monitoreo y Logging

### Para Producción
```typescript
// 1. Error tracking (Sentry)
import * as Sentry from "@sentry/angular";
Sentry.init({ dsn: "..." });

// 2. Analytics (Google Analytics)
gtag('event', 'message_sent', { chat_id: chatId });

// 3. Performance monitoring
import { trace } from '@angular/fire/performance';

// 4. Logging service
@Injectable({ providedIn: 'root' })
export class LoggerService {
  error(message: string, error: Error) {
    console.error(message, error);
    // Enviar a backend
  }
}
```

## CI/CD Pipeline

### Ejemplo con GitHub Actions
```yaml
name: CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run lint
      - run: npm run test:headless
      - run: npm run build:prod
  
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy
```

## Conclusión

Esta arquitectura proporciona:
- ✅ **Mantenibilidad**: Código limpio y organizado
- ✅ **Escalabilidad**: Fácil de extender
- ✅ **Testabilidad**: Servicios desacoplados
- ✅ **Performance**: Lazy loading, signals, async pipe
- ✅ **Modernidad**: Angular 19, standalone, signals
- ✅ **Productividad**: Material UI, TypeScript strict

Es una base sólida para evolucionar hacia una aplicación de producción completa.
