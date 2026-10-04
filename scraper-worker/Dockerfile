FROM node:22-bookworm-slim

ENV PUPPETEER_SKIP_DOWNLOAD=false
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js README.md ./
ENV PORT=8787
EXPOSE 8787
CMD ["node", "server.js"]
