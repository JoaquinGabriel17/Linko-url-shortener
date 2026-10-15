# Imagen de producción del backend (API Express + Mongoose).
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Se copian solo los manifiestos primero para aprovechar la caché de capas:
# mientras no cambien las dependencias, este npm ci no se vuelve a ejecutar.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# El puerto real lo define la variable PORT (por defecto 10000, ver config/env.js).
EXPOSE 10000

# Verifica que la API responda. Nota: server.js recién hace listen después de
# conectar a Mongo, así que un 200 implica que arrancó con DB disponible al
# inicio; no re-verifica la salud continua de MongoDB.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-10000}/" > /dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
