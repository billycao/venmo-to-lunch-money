FROM node:19-bullseye-slim

ENV NODE_ENV production

USER node
COPY node/* /app
RUN npm ci

CMD "npm" "start"
