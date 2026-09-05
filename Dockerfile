FROM node:20-alpine

# ffmpeg vajadzīgs skaļuma izlīdzināšanas (loudness normalization) mērīšanai
# augšupielādes brīdī. hunspell vajadzīgs latviešu valodas pareizrakstības
# pārbaudei admin panelī (vārdnīcas faili nāk līdzi projektam, skat.
# dictionaries/ mapi). Ja kāds no tiem kādreiz trūktu, attiecīgā funkcija
# droši turpina strādāt bez tās daļas — nekas cits netiek bloķēts.
RUN apk add --no-cache ffmpeg hunspell

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
