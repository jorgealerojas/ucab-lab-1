FROM node:24-bookworm-slim

WORKDIR /usr/src/app
COPY --chown=node:node package.json app.js state-service.js ./
COPY --chown=node:node test ./test

USER node
EXPOSE 3000 4000
CMD ["node", "app.js"]
