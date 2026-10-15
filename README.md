# Linko — Acortador de URLs

Acortador de URLs con autenticación de usuarios, dashboard para gestionar enlaces y redirección automática. Los códigos cortos son propios del backend (no de un servicio externo), con alias personalizados, deduplicación por usuario y conteo de clics.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 24, Express 5, MongoDB, Mongoose, JWT, bcryptjs, zod, express-rate-limit, helmet |
| Frontend | React 19, Vite 7, React Router DOM 7, Axios |
| Tests | Vitest + supertest + mongodb-memory-server |
| Infra | Docker / Docker Compose, GitHub Actions |
| Despliegue | Render (backend), Vercel (frontend) |

## Estructura del proyecto

```
Linko-url-shortener/
├── backend/                  # API REST (Express + MongoDB)
│   ├── app.js                # Crea y exporta la app Express (sin listen)
│   ├── server.js             # Valida env, conecta a Mongo y hace listen
│   ├── config/               # Validación de variables de entorno (zod)
│   ├── middleware/           # auth, optionalAuth, token, rateLimit
│   ├── models/               # Modelos Mongoose (Link, User)
│   ├── routes/               # Rutas (urlRoutes, links, auth)
│   ├── services/             # Códigos, alias y validación de URLs
│   ├── tests/                # Vitest + supertest + mongodb-memory-server
│   ├── eslint.config.js      # ESLint (flat config)
│   ├── Dockerfile            # Imagen de la API
│   ├── .dockerignore
│   └── package.json
├── frontend/                 # SPA (React + Vite)
│   ├── src/                  # Componentes, context y cliente axios
│   ├── vercel.json           # Config de despliegue (SPA routing)
│   └── package.json
├── .github/workflows/ci.yml  # CI: lint + tests (backend) y lint + build (frontend)
├── docker-compose.yml        # API + MongoDB
├── .env.example              # Overrides opcionales del compose
└── README.md
```

## Requisitos previos

- **Node.js** 24.x (LTS) — hay un `.nvmrc` en `backend/` y `frontend/`
- **MongoDB** — local, [MongoDB Atlas](https://www.mongodb.com/atlas) (tier gratuito) o el contenedor de Compose
- **Docker + Docker Compose** — solo si vas a usar la opción Docker
- El backend **no necesita compilación** (ESM + Node); el frontend sí se buildea con Vite.

## Puesta en marcha

### Opción A — Docker Compose (API + MongoDB)

Levanta la API y una instancia de MongoDB con un solo comando (desde la raíz):

```bash
docker compose up --build
```

- API: `http://localhost:10000`
- MongoDB: interno, **no** se publica al host; persiste en el volumen `mongo-data`.
- No hace falta crear ningún `.env`: el compose trae valores por defecto para desarrollo.

Si el puerto `10000` está ocupado, cambiá el puerto (afecta al mapeo, a `PORT` y a `BASE_URL` de forma consistente):

```bash
API_PORT=10001 docker compose up --build      # Linux/macOS/CI
$env:API_PORT=10001; docker compose up --build # PowerShell (Windows)
```

El frontend **no** está contenerizado: corrélo aparte con la opción B y apuntá `VITE_API_URL` a la API del compose.

### Opción B — Local (desarrollo)

**Backend**

```bash
cd backend
npm install
npm run dev        # http://localhost:10000 (o el PORT definido)
```

Requiere un `backend/.env` (ver [Variables de entorno](#variables-de-entorno)).

**Frontend**

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Requiere `frontend/.env` con `VITE_API_URL` apuntando al backend.

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Requerida / default |
|----------|-------------|---------------------|
| `MONGO_URI` | URI de conexión a MongoDB | **Requerida** |
| `JWT_SECRET` | Secreto para firmar tokens JWT (mínimo 32 caracteres) | **Requerida** |
| `BASE_URL` | URL pública del backend; con ella se construye cada `shortUrl`. Sin barra final | **Requerida** |
| `ALLOWED_ORIGINS` | Orígenes permitidos por CORS, separados por coma | **Requerida** |
| `PORT` | Puerto del servidor | Default: `10000` |
| `JWT_EXPIRES_IN` | Vigencia del token (ej: `1d`, `12h`, `30m`) | Default: `1d` |
| `RATE_LIMIT_WINDOW_MS` | Ventana del rate limiting de `/auth` y creación (ms) | Default: `900000` |
| `RATE_LIMIT_AUTH_MAX` | Máx. requests por ventana en `/auth/login` y `/auth/register` | Default: `10` |
| `RATE_LIMIT_CREATE_MAX` | Máx. requests por ventana en la creación de links | Default: `30` |
| `RATE_LIMIT_REDIRECT_WINDOW_MS` | Ventana del rate limiting de la redirección (ms) | Default: `60000` |
| `RATE_LIMIT_REDIRECT_MAX` | Máx. requests por ventana en la redirección | Default: `120` |
| `SHORT_CODE_LENGTH` | Longitud de los códigos cortos autogenerados (3-30) | Default: `6` |
| `SHORT_CODE_MAX_RETRIES` | Reintentos ante colisión del índice único de `shortCode` (1-20) | Default: `5` |

> La validación se hace con **zod** al arrancar (`backend/config/env.js`): si falta o es inválida alguna variable requerida, el proceso **sale con código 1** y un mensaje claro. Para generar un `JWT_SECRET` seguro: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

### Frontend (`frontend/.env`)

| Variable | Descripción | Requerida / default |
|----------|-------------|---------------------|
| `VITE_API_URL` | URL base del backend (usada por el único cliente axios, `frontend/src/api.js`) | **Requerida en build** |

### Docker Compose (`.env` en la raíz, opcional)

El compose funciona **sin** `.env` (usa defaults para desarrollo). Copiá `.env.example` a `.env` solo si querés overridear:

| Variable | Descripción | Default del compose |
|----------|-------------|---------------------|
| `API_PORT` | Puerto publicado en el host y usado por la API | `10000` |
| `ALLOWED_ORIGINS` | Orígenes permitidos por CORS | `http://localhost:5173` |
| `JWT_SECRET` | Secreto JWT (mínimo 32 chars). El default es **inseguro y solo para desarrollo local**. | `dev-only-insecure-...` |

> ⚠️ **El `JWT_SECRET` por defecto del compose es público y predecible: solo sirve para desarrollo local.** En producción siempre definí un `JWT_SECRET` propio. `BASE_URL`/`PORT` del contenedor derivan de `API_PORT`, por eso no se configuran por separado.

## Scripts disponibles

### Backend

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor con nodemon (hot-reload) |
| `npm start` | Inicia el servidor con node |
| `npm run lint` | Ejecuta ESLint sobre código y tests |
| `npm test` | Ejecuta los tests (Vitest) |

### Frontend

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia Vite dev server |
| `npm run build` | Genera build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | Ejecuta ESLint |

## Endpoints API

| Método | Ruta | Auth | Propósito | Respuestas relevantes |
|--------|------|------|-----------|-----------------------|
| `POST` | `/auth/register` | No | Registrar usuario. Body: `{ username, email, password }` (password ≥ 8) | `201`, `400` (validación/duplicado), `429` |
| `POST` | `/auth/login` | No | Iniciar sesión. Body: `{ email, password }` | `200`, `400`, `401`, `429` |
| `POST` | `/links/create` | Opcional | Endpoint único de creación. Body: `{ originalUrl, shortCode?, name?, description?, forceNew? }`. Respuesta: `{ shortUrl, shortCode, originalUrl }` (+ `deduplicated: true` al deduplicar) | `201` (creado), `200` (deduplicado), `400`, `401` (alias anónimo / token inválido), `409` (alias en uso), `429`, `503` (colisión de código) |
| `GET` | `/:shortCode` | No | Redirige (302) a la URL original e incrementa `clicks` | `302`, `404`, `429` |
| `GET` | `/links` | Sí | Lista los links del usuario. Query: `?sort=clicks\|createdAt` (prefijo `-` para desc), `?limit=<n>` (tope 100) | `200`, `400`, `401` |
| `PUT` | `/links/:id` | Sí | Edita un link propio. Body: `{ name?, description?, originalUrl? }` (solo http/https). El `shortCode` **no** se modifica | `200`, `400`, `401`, `404` |
| `PATCH` | `/links/:id` | Sí | Igual que `PUT` | `200`, `400`, `401`, `404` |
| `DELETE` | `/links/:id` | Sí | Elimina un link propio | `200`, `401`, `404` |

> Con JWT válido, `POST /links/create` guarda el link asociado al usuario; sin token, lo crea como anónimo.
> El dueño siempre se toma del JWT (`req.user.id`), nunca del body/query. Si el link no pertenece al usuario (o no existe) se responde **404** (no se revela existencia).
> El backend usa `helmet`, `trust proxy` y rate limiting (`express-rate-limit`); los intentos fallidos de login cuentan, los exitosos no.

## Códigos cortos, alias, validación y deduplicación

Toda la lógica vive en servicios compartidos (`backend/services/`) y se usa tanto en la creación como en la edición:

- **Generación de códigos** (`services/shortCode.js`): códigos base62 (`0-9A-Za-z`) con `nanoid`, longitud configurable (`SHORT_CODE_LENGTH`). Se descartan los códigos que coinciden con un alias reservado. Ante una colisión del índice único de `shortCode` (`E11000`) se reintenta con un código nuevo hasta `SHORT_CODE_MAX_RETRIES`; si se agotan, se responde **503** (nunca **500**). No se usa `Math.random()`.
- **Alias** (`services/alias.js`): el campo `shortCode` aceptado en la creación es un alias. Charset `[a-zA-Z0-9_-]`, longitud 3-30, y lista de reservadas case-insensitive (`api`, `admin`, `login`, `register`, `links`, `auth`, `shorten`, rutas reales y de infraestructura). Un alias ya usado responde **409**; inválido o reservado, **400**. Los alias son **sensibles a mayúsculas** (`miAlias` ≠ `mialias`); la comprobación de reservadas es **insensible**. Solo usuarios autenticados pueden enviar alias (anónimo con alias → **401**).
- **Validación de URL** (`services/url.js`): solo `http:`/`https:`, máximo 2048 caracteres (también sobre la forma normalizada), sin credenciales embebidas y sin auto-referencia (hostname de `BASE_URL` o de `ALLOWED_ORIGINS`). Se rechazan `javascript:`, `data:`, `file:`, `ftp:`, etc. La validación se aplica en la creación y, si cambia `originalUrl`, en la edición. El modelo `Link` valida además `originalUrl` como defensa en profundidad.
- **Deduplicación**: si un usuario autenticado acorta la misma URL normalizada **sin** alias, sin `forceNew` y sin `name`/`description`, se devuelve el link existente con **200** (`deduplicated: true`) en vez de crear uno nuevo (**201**). `forceNew: true` fuerza uno nuevo. Los anónimos no se deduplican. La deduplicación es **por usuario**: dos usuarios distintos que acortan la misma URL obtienen cada uno su propio enlace.
- **Validación de entrada**: todos los endpoints de `links.js` validan body, params (`:id` como ObjectId) y query (`sort`/`limit`) con **zod**. Un id malformado responde **404**, nunca un error de cast.

## Conexión frontend ↔ backend en desarrollo

El backend permite los orígenes definidos en `ALLOWED_ORIGINS` (lista separada por coma). Para desarrollo local, incluí el origen de Vite:

```
ALLOWED_ORIGINS=http://localhost:5173,https://url-shortener-xi-lac.vercel.app
```

En `frontend/.env`, la variable `VITE_API_URL` debe apuntar al backend:

```
VITE_API_URL=http://localhost:10000
```

## Verificación manual del flujo completo

Con la API arriba (local o `docker compose up`):

```bash
# 1. Registrar usuario (guarda el token de la respuesta)
curl -X POST http://localhost:10000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# 2. Login (devuelve token)
curl -X POST http://localhost:10000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 3. Crear link anónimo (201)
curl -X POST http://localhost:10000/links/create \
  -H "Content-Type: application/json" \
  -d '{"originalUrl":"https://www.ejemplo.com/articulo-largo"}'

# 4. Crear link autenticado con alias (201)
curl -X POST http://localhost:10000/links/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TU_TOKEN>" \
  -d '{"originalUrl":"https://www.ejemplo.com","shortCode":"mi-alias","name":"Mi enlace"}'

# 5. Redirigir (302) al destino
curl -i http://localhost:10000/<SHORT_CODE>

# 6. Deduplicar: repetir el paso 3 con el mismo token y URL → 200 con deduplicated:true
# 7. Listar los links del usuario (200)
curl http://localhost:10000/links -H "Authorization: Bearer <TU_TOKEN>"
```

## Decisiones técnicas

- **Redirección 302 (no 301).** El backend responde `302 Found`. Un `301` quedaría cacheado por navegadores y buscadores, que usarían la copia cacheada sin volver a pegarle al backend: dejaríamos de contar clics y no podríamos cambiar el destino sin que el usuario limpie caché. El `302` hace que cada visita pase por la API.
- **Por qué la redirección la resuelve el backend.** Los enlaces cortos apuntan al dominio del backend, que es el dueño del mapeo `shortCode → URL`. Así el conteo de clics es exacto y atómico (`findOneAndUpdate` con `$inc`, sin condiciones de carrera ni pérdida de clics) y la lógica queda en un solo lugar.
- **Estrategia anti-colisión.** Los códigos se generan con `nanoid` base62 (nunca `Math.random()`), descartando los reservados. Como dos códigos pueden colisionar, existe un **índice único** sobre `shortCode` en MongoDB como garantía real a nivel de base de datos. Al crear:
  - **Alias explícito** (usuario eligió el código): no se reintenta; si ya existe, responde **409**.
  - **Código autogenerado**: ante `E11000` sobre `shortCode` se reintenta con un código nuevo hasta `SHORT_CODE_MAX_RETRIES`; si se agotan, responde **503** con `Retry-After` (nunca **500**). Una colisión de otro índice o cualquier otro error se propaga.
- **Validación de URLs.** Solo `http`/`https`, longitud máxima 2048 (cruda y normalizada), sin credenciales embebidas (`usuario:pass@host`) y sin auto-referencia al propio servicio (`BASE_URL`/`ALLOWED_ORIGINS`), para no crear bucles de redirección. El modelo `Link` repite la validación como defensa en profundidad.
- **Autorización y propiedad de enlaces.** El dueño se toma siempre del JWT (`req.user.id`), nunca del body ni de la query. Editar/borrar se filtra por `{ _id, createdBy }`, y si el link no es del usuario se responde **404** (no **403**) para no revelar su existencia. El `shortCode` es inmutable en la edición y `zod.strict()` bloquea *mass assignment* (`clicks`, `createdBy`).
- **Rate limiting.** `express-rate-limit` con stores separados para login, register, creación y redirección. El login usa `skipSuccessfulRequests`, así solo cuentan los intentos fallidos (brute-force). `trust proxy = 1` para obtener la IP real detrás del proxy de despliegue.
- **Backend sin build.** El backend es ESM y corre directo con Node (`node server.js`): no tiene paso de compilación. La verificación del proyecto es **ESLint** (analiza ejecución y tests) más **Vitest**; el CI no simula un build inexistente. El frontend sí se compila con `vite build`.
- **Config falla rápido.** Las variables de entorno se validan con zod al arrancar; una config inválida corta el proceso con código 1 y un mensaje accionable.

## Diferencias entre ejecución local y Docker

| Aspecto | Local | Docker Compose |
|---------|-------|----------------|
| Qué levanta | Backend (y frontend por separado) | API + MongoDB |
| MongoDB | Instancia local o Atlas | Contenedor `mongo:7`, puerto **no** publicado |
| Configuración | `backend/.env` obligatorio | Defaults del compose; `.env` raíz opcional |
| `MONGO_URI` | `mongodb://localhost:27017/...` o Atlas | `mongodb://mongo:27017/linko` (nombre del servicio) |
| `BASE_URL` / `PORT` | Definidos en `.env` | Derivados de `API_PORT` |
| Persistencia | La de tu MongoDB local | Volumen nombrado `mongo-data` |
| Frontend | `npm run dev` | Igual: correr aparte y apuntar `VITE_API_URL` a la API |

> **Persistencia en Docker:** `docker compose down` **conserva** los datos (el volumen `mongo-data` sigue existiendo); `docker compose down -v` los borra.

## Despliegue

- **Backend**: se despliega en [Render](https://render.com) usando `npm start`. Render inyecta la variable `PORT` automáticamente.
- **Frontend**: se despliega en [Vercel](https://vercel.com) con `npm run build`. El archivo `vercel.json` configura rewrites para SPA routing.

## Tests y CI

- **Backend**: Vitest + supertest + `mongodb-memory-server` (no requiere una MongoDB real). Cubre generación y colisiones de códigos, alias, redirección 302 y clics, validación de URLs, deduplicación por usuario y propiedad de enlaces, JWT/CORS y rate limiting.
- **Frontend**: ESLint + `vite build`.
- **CI** (`.github/workflows/ci.yml`): en cada push y pull request corre el job de backend (`npm ci` → `npm run lint` → `npm test`) y el de frontend (`npm ci` → `npm run lint` → `npm run build`).
