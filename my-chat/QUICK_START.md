# 🚀 Quick Start Guide

## Instalación Rápida

```bash
cd my-chat
npm install
npm start
```

Abre http://localhost:4200

## Usuarios de Prueba

- **Email**: `juan@test.com` | **Password**: cualquiera
- **Email**: `maria@test.com` | **Password**: cualquiera

## Comandos Principales

```bash
# Desarrollo
npm start                    # Inicia servidor de desarrollo

# Build
npm run build               # Build de desarrollo
npm run build:prod          # Build de producción

# Testing
npm test                    # Tests en modo watch
npm run test:headless       # Tests sin interfaz (CI)

# Calidad de Código
npm run lint                # Ejecutar ESLint
npm run format              # Formatear código con Prettier
npm run format:check        # Verificar formato
```

## Estructura del Proyecto

```
my-chat/
├── src/
│   ├── app/
│   │   ├── core/                    # Servicios globales
│   │   │   ├── guards/              # Guards de rutas
│   │   │   ├── interceptors/        # HTTP interceptors
│   │   │   └── services/            # Servicios (Auth, Chat, Presence)
│   │   ├── features/                # Features por módulo
│   │   │   ├── auth/                # Login
│   │   │   └── chat/                # Chat (lista + detalle)
│   │   ├── models/                  # Interfaces TypeScript
│   │   ├── shared/                  # Componentes reutilizables
│   │   │   └── pipes/               # Pipes (timeAgo)
│   │   ├── app.component.ts         # Componente raíz
│   │   ├── app.config.ts            # Configuración de la app
│   │   └── app.routes.ts            # Rutas
│   ├── styles.scss                  # Estilos globales
│   └── index.html                   # HTML principal
├── package.json
├── angular.json
├── tsconfig.json
├── README.md                        # Documentación completa
├── ARCHITECTURE.md                  # Decisiones de arquitectura
├── PRODUCTION.md                    # Guía de producción
└── QUICK_START.md                   # Esta guía
```

## Características Implementadas

### ✅ Autenticación
- Login con usuarios mock
- Guard para proteger rutas
- Interceptor HTTP para tokens
- Persistencia en localStorage

### ✅ Chat
- Lista de conversaciones
- Búsqueda de chats
- Vista de mensajes
- Envío de mensajes
- Estados: enviado → entregado → leído
- Indicador "escribiendo..."
- Estado online/offline

### ✅ UI/UX
- Diseño tipo WhatsApp Web
- Responsive (desktop + mobile)
- Angular Material
- Accesibilidad básica (ARIA)
- Estados vacíos

### ✅ Arquitectura
- Standalone Components (Angular 19)
- Signals + RxJS
- Clean Code
- SOLID principles
- Tests unitarios

## Tecnologías

| Categoría | Tecnología |
|-----------|------------|
| Framework | Angular 19 |
| UI Library | Angular Material |
| Lenguaje | TypeScript 5.7 |
| Estilos | SCSS |
| Estado | Signals + RxJS |
| Testing | Jasmine + Karma |
| Linting | ESLint |
| Formato | Prettier |

## Flujo de la Aplicación

```
1. Usuario accede a /
   ↓
2. Redirige a /chats
   ↓
3. AuthGuard verifica autenticación
   ↓
4a. Si NO autenticado → /login
4b. Si autenticado → /chats
   ↓
5. Usuario ve lista de chats
   ↓
6. Usuario selecciona un chat
   ↓
7. Se cargan mensajes del chat
   ↓
8. Usuario envía mensaje
   ↓
9. Mensaje se muestra instantáneamente
   ↓
10. Estado cambia: sent → delivered → read
```

## Arquitectura de Datos

```
┌──────────────────────────────────────┐
│          Components                   │
│  (ChatList, ChatDetail, Login)       │
└────────────┬─────────────────────────┘
             │ async pipe / signals
             ↓
┌──────────────────────────────────────┐
│          Services                     │
│  (AuthService, ChatService)          │
│  BehaviorSubject + Observables       │
└────────────┬─────────────────────────┘
             │
             ↓
┌──────────────────────────────────────┐
│       Mock Data (en memoria)         │
│  (En producción: HTTP + WebSocket)   │
└──────────────────────────────────────┘
```

## Próximos Pasos

### Para Desarrollo Local
1. ✅ Instalar dependencias: `npm install`
2. ✅ Iniciar app: `npm start`
3. ✅ Explorar código en `src/app/`
4. ✅ Ejecutar tests: `npm test`

### Para Producción
1. 📖 Leer `PRODUCTION.md`
2. 🔧 Configurar backend (Node.js + Express + Socket.IO)
3. 🗄️ Configurar base de datos (MongoDB o PostgreSQL)
4. 🔐 Implementar autenticación real (JWT o Cognito)
5. 🌐 Configurar WebSocket para tiempo real
6. 🚀 Deploy (Vercel + Railway/Render)

## Recursos Útiles

### Documentación
- [README.md](./README.md) - Documentación completa
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Decisiones de arquitectura
- [PRODUCTION.md](./PRODUCTION.md) - Guía de producción

### Links Externos
- [Angular Docs](https://angular.dev)
- [Angular Material](https://material.angular.io)
- [RxJS](https://rxjs.dev)
- [TypeScript](https://www.typescriptlang.org)

## Troubleshooting

### Error: Port 4200 already in use
```bash
# Matar proceso en puerto 4200
lsof -ti:4200 | xargs kill -9
# O usar otro puerto
ng serve --port 4201
```

### Error: Module not found
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Tests fallan
```bash
# Limpiar cache
npm run test -- --no-cache
```

### Build falla
```bash
# Verificar versión de Node
node --version  # Debe ser >= 18.19

# Limpiar y rebuild
rm -rf dist
npm run build
```

## Preguntas Frecuentes

### ¿Por qué Standalone Components?
- Más moderno y recomendado por Angular
- Menos boilerplate
- Mejor tree-shaking
- Futuro de Angular

### ¿Por qué Signals + RxJS?
- Signals: Estado local, mejor performance
- RxJS: Operaciones async, streams complejos
- Mejor de ambos mundos

### ¿Cómo conectar a un backend real?
Ver `PRODUCTION.md` sección "Migración de Mock a Backend Real"

### ¿Cómo agregar más features?
```bash
# Generar componente
ng generate component features/settings/settings

# Generar servicio
ng generate service core/services/notification

# Generar guard
ng generate guard core/guards/admin
```

### ¿Cómo hacer deploy?
```bash
# Build de producción
npm run build:prod

# Deploy a Vercel
vercel

# O a Netlify
netlify deploy --prod --dir=dist/my-chat/browser
```

## Contacto y Soporte

- 📧 Email: support@mychat.com
- 🐛 Issues: GitHub Issues
- 💬 Discord: discord.gg/mychat
- 📚 Docs: docs.mychat.com

---

**¡Feliz coding! 🎉**
