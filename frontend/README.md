# Linko — Frontend

SPA en React + Vite para acortar URLs, gestionar enlaces y autenticarse. Consume la API del backend (ver el [README raíz](../README.md)).

## Requisitos

- Node.js 24.x (hay un `.nvmrc`)

## Instalación

```bash
npm install
```

## Configuración

Creá `frontend/.env` a partir de `.env.example`:

```bash
VITE_API_URL=http://localhost:10000
```

`VITE_API_URL` es la URL base del backend y la usa el único cliente axios (`src/api.js`). Se inyecta en **build-time** por Vite, así que hay que recompilar al cambiarla.

## Ejecución local

```bash
npm run dev        # http://localhost:5173
```

Asegurate de que el backend permita el origen `http://localhost:5173` en su `ALLOWED_ORIGINS`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Vite dev server con HMR |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | ESLint |

## Estructura

```
src/
├── components/   # Vistas y componentes (UrlForm, UserDashboard, Login, ...)
├── context/      # Sesión de usuario (UserContext + UserProvider)
├── lib/          # Utilidades (useCopy)
├── api.js        # Cliente axios + manejo de errores y 401
├── session.js    # Persistencia del token
├── App.jsx       # Home
└── main.jsx      # Router y montaje
```
