# Linko — Acortador de URLs

Acortador de URLs con autenticación de usuarios, dashboard para gestionar enlaces y redirección automática.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js, Express 5, MongoDB, Mongoose, JWT, bcryptjs |
| Frontend | React 19, Vite 7, React Router DOM 7, Axios |
| Despliegue | Render (backend), Vercel (frontend) |

## Estructura del proyecto

```
Linko-url-shortener/
├── backend/              # API REST (Express + MongoDB)
│   ├── app.js            # Crea y exporta la app Express (sin listen)
│   ├── server.js         # Valida env, conecta a Mongo y hace listen
│   ├── config/           # Validación de variables de entorno (zod)
│   ├── middleware/       # auth (JWT obligatorio) y optionalAuth
│   ├── models/           # Modelos Mongoose (Link, User)
│   ├── routes/           # Rutas (urlRoutes, links, auth)
│   ├── tests/            # Tests (Vitest + supertest + mongodb-memory-server)
│   └── package.json
├── frontend/             # SPA (React + Vite)
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── context/      # Context API (UserContext)
│   │   └── App.jsx
│   ├── vite.config.js
│   ├── vercel.json       # Config de despliegue (SPA routing)
│   └── package.json
└── package-lock.json     # Lockfile raíz (sin workspaces)
```

## Requisitos previos

- **Node.js** 24.x (LTS) — hay un `.nvmrc` en `backend/` y `frontend/`
- **MongoDB** — local o [MongoDB Atlas](https://www.mongodb.com/atlas) (tier gratuito)

## Instalación

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

## Cómo levantar el proyecto

### Backend (desarrollo)

```bash
cd backend
npm run dev
```

El servidor correrá en `http://localhost:10000` (o el puerto definido en `PORT`).

### Frontend (desarrollo)

```bash
cd frontend
npm run dev
```

La app correrá en `http://localhost:5173`.

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `PORT` | Puerto del servidor | No (default: `10000`) |
| `MONGO_URI` | URI de conexión a MongoDB | Sí |
| `JWT_SECRET` | Secreto para firmar tokens JWT (mínimo 32 caracteres) | Sí |
| `JWT_EXPIRES_IN` | Vigencia del token (ej: `1d`, `12h`, `30m`) | No (default: `1d`) |
| `BASE_URL` | URL pública del backend; con ella se construye cada `shortUrl`. Sin barra final | Sí |
| `ALLOWED_ORIGINS` | Orígenes permitidos por CORS, separados por coma | Sí |
| `RATE_LIMIT_WINDOW_MS` | Ventana del rate limiting de `/auth` y creación (ms) | No (default: `900000`) |
| `RATE_LIMIT_AUTH_MAX` | Máx. requests por ventana en `/auth/login` y `/auth/register` | No (default: `10`) |
| `RATE_LIMIT_CREATE_MAX` | Máx. requests por ventana en la creación de links | No (default: `30`) |
| `RATE_LIMIT_REDIRECT_WINDOW_MS` | Ventana del rate limiting de la redirección (ms) | No (default: `60000`) |
| `RATE_LIMIT_REDIRECT_MAX` | Máx. requests por ventana en la redirección | No (default: `120`) |
| `SHORT_CODE_LENGTH` | Longitud de los códigos cortos autogenerados (3-30) | No (default: `6`) |
| `SHORT_CODE_MAX_RETRIES` | Reintentos ante colisión del índice único de `shortCode` (1-20) | No (default: `5`) |

> La validación se hace con **zod** al arrancar (`backend/config/env.js`): si falta o es inválida alguna variable requerida, el proceso **sale con código 1** y un mensaje claro. Para generar un `JWT_SECRET` seguro: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

### Frontend (`frontend/.env`)

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `VITE_API_URL` | URL base del backend (usada por el único cliente axios, `frontend/src/api.js`) | Sí |

## Scripts disponibles

### Backend

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor con nodemon (hot-reload) |
| `npm start` | Inicia el servidor con node |
| `npm test` | Ejecuta los tests (Vitest) |

### Frontend

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia Vite dev server |
| `npm run build` | Genera build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | Ejecuta ESLint |

## Endpoints API

| Método | Ruta | Descripción | Requiere JWT |
|--------|------|-------------|--------------|
| `POST` | `/links/create` | Endpoint único de creación. Body: `{ "originalUrl", "shortCode?", "name?", "description?", "forceNew?" }`. Respuesta: `{ shortUrl, shortCode, originalUrl }` (agrega `deduplicated: true` cuando deduplica) | Opcional |
| `GET` | `/:shortCode` | Redirige (302) a la URL original e incrementa `clicks` | No |
| `GET` | `/links` | Lista los links del usuario autenticado. Query: `?sort=clicks\|createdAt` (prefijo `-` para desc), `?limit=<n>` (tope 100) | Sí |
| `PUT` | `/links/:id` | Edita un link propio. Body: `{ "name?", "description?", "originalUrl?" }` (solo http/https). El `shortCode` **no** se puede modificar | Sí |
| `PATCH` | `/links/:id` | Igual que `PUT` | Sí |
| `DELETE` | `/links/:id` | Elimina un link propio | Sí |
| `POST` | `/auth/register` | Registrar usuario. Body: `{ "username", "email", "password" }` (password ≥ 8) | No |
| `POST` | `/auth/login` | Iniciar sesión. Body: `{ "email", "password" }` | No |

> Con JWT válido, `POST /links/create` guarda el link asociado al usuario; sin token, lo crea como anónimo.
> El dueño siempre se toma del JWT (`req.user.id`), nunca del body/query. Si el link no pertenece al usuario (o no existe) se responde **404**.
> El backend usa `helmet`, `trust proxy` y rate limiting (`express-rate-limit`); los intentos fallidos de login cuentan, los exitosos no.

## Códigos cortos, alias, validación y deduplicación

Toda la lógica vive en servicios compartidos (`backend/services/`) y se usa tanto en la creación como en la edición:

- **Generación de códigos** (`services/shortCode.js`): códigos base62 (`0-9A-Za-z`) con `nanoid`, longitud configurable (`SHORT_CODE_LENGTH`). Se descartan los códigos que coinciden con un alias reservado. Ante una colisión del índice único de `shortCode` (`E11000`) se reintenta con un código nuevo hasta `SHORT_CODE_MAX_RETRIES`; si se agotan, se responde **503** (nunca **500**). No se usa `Math.random()`.
- **Alias** (`services/alias.js`): el campo `shortCode` aceptado en la creación es un alias. Charset `[a-zA-Z0-9_-]`, longitud 3-30, y lista de reservadas case-insensitive (`api`, `admin`, `login`, `register`, `links`, `auth`, `shorten`, rutas reales y de infraestructura). Un alias ya usado responde **409**; inválido o reservado, **400**. Los alias son **sensibles a mayúsculas** (`miAlias` ≠ `mialias`); la comprobación de reservadas es **insensible**. Solo usuarios autenticados pueden enviar alias (anónimo con alias → **401**). El `shortCode` no se modifica en la edición.
- **Validación de URL** (`services/url.js`): solo `http:`/`https:`, máximo 2048 caracteres (también sobre la forma normalizada), sin credenciales embebidas y sin auto-referencia (hostname de `BASE_URL` o de `ALLOWED_ORIGINS`). Se rechazan `javascript:`, `data:`, `file:`, `ftp:`, etc. La validación se aplica en la creación y, si cambia `originalUrl`, en la edición. El modelo `Link` valida además `originalUrl` como defensa en profundidad.
- **Deduplicación**: si un usuario autenticado acorta la misma URL normalizada **sin** alias, sin `forceNew` y sin `name`/`description`, se devuelve el link existente con **200** (`deduplicated: true`) en vez de crear uno nuevo (**201**). `forceNew: true` fuerza uno nuevo. Los anónimos no se deduplican.
- **Validación de entrada**: todos los endpoints de `links.js` validan body, params (`:id` como ObjectId) y query (`sort`/`limit`) con **zod**. Un id malformado responde **404**, nunca un error de cast.

## Conexión frontend ↔ backend en desarrollo

El backend permite los orígenes definidos en `ALLOWED_ORIGINS` (lista separada por coma). Para desarrollo local, incluí el origen de Vite:

```
ALLOWED_ORIGINS=http://localhost:5173,https://url-shortener-xi-lac.vercel.app
```

En `frontend/.env`, la variable `VITE_API_URL` debe apuntar al backend local:

```
VITE_API_URL=http://localhost:10000
```

## Ejemplo de uso

### Registrar usuario

```bash
curl -X POST http://localhost:10000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

### Login (guardar token)

```bash
curl -X POST http://localhost:10000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Guarda el `token` de la respuesta para los siguientes pasos.

### Acortar URL (anónimo)

```bash
curl -X POST http://localhost:10000/links/create \
  -H "Content-Type: application/json" \
  -d '{"originalUrl":"https://www.ejemplo.com/articulo-largo"}'
```

### Crear link autenticado

```bash
curl -X POST http://localhost:10000/links/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TU_TOKEN>" \
  -d '{"originalUrl":"https://www.ejemplo.com","name":"Mi enlace"}'
```

### Visitar el short code

```bash
curl http://localhost:10000/<SHORT_CODE>
```

Redirige a la URL original.

## Obtener MONGO_URI

### MongoDB local

Si tenés MongoDB instalado localmente:

```
MONGO_URI=mongodb://localhost:27017/linko
```

### MongoDB Atlas

1. Crear cuenta gratuita en [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Crear cluster (tier gratuito M0)
3. En **Database Access**, crear un usuario con contraseña
4. En **Network Access**, agregar `0.0.0.0/0` (allow from anywhere) o tu IP
5. En **Database**, click en **Connect** → **Drivers** → copiar URI
6. Reemplazar `<password>` y `<dbname>`:

```
MONGO_URI=mongodb+srv://usuario:<password>@cluster0.xxxxx.mongodb.net/linko
```

## Build y despliegue

- **Backend**: se despliega en [Render](https://render.com) usando `npm start`. Render inyecta la variable `PORT` automáticamente.
- **Frontend**: se despliega en [Vercel](https://vercel.com) con `npm run build`. El archivo `vercel.json` configura rewrites para SPA routing.

## Estado actual

- Tests automatizados del backend (Vitest + supertest + mongodb-memory-server)
- Sin Docker / docker-compose
- Sin CI/CD configurado
