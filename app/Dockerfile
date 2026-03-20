FROM node:20-alpine

RUN apk upgrade --no-cache && \
    npm install -g npm@latest

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY server.js ./

RUN chown -R node:node /usr/src/app

USER node

EXPOSE 8080

CMD ["node", "server.js"]