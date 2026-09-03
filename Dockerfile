FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# Persisted data lives here — mount a volume at /app/data and /app/uploads
# in production so content survives redeploys.
RUN mkdir -p data uploads/audio uploads/images

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
