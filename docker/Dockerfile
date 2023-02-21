FROM node:19-bullseye-slim as ts-build

WORKDIR /usr/src/app

ENV NODE_ENV development

COPY node/package.json .
COPY node/package-lock.json .
COPY node/tsconfig.json .
RUN npm ci
COPY node/src/ ./src
RUN npm run build


FROM node:19-bullseye-slim

ENV DATA_DIR /data
VOLUME /data
RUN mkdir /data
RUN chown node:node /data

RUN apt-get update && apt-get upgrade -y

ENV NODE_ENV production

WORKDIR /usr/src/app
COPY --from=ts-build /usr/src/app/package.json .
COPY --from=ts-build /usr/src/app/package-lock.json .
RUN npm ci

COPY node/config ./config
COPY --from=ts-build --chown=node:node /usr/src/app/built ./built

USER node
ENV NODE_CONFIG_ENV docker
CMD ["npm", "start"]
