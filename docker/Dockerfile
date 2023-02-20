FROM node:19-bullseye-slim

RUN apt-get update && apt-get upgrade -y

# Add Tini
# See https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#handling-kernel-signals
ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]

ENV NODE_ENV production
ENV NODE_CONFIG_ENV docker

WORKDIR /usr/usrc/app
COPY node/config ./config
COPY node/app.js .
COPY node/package.json .
COPY node/package-lock.json .
COPY node/venmo-lib.js .
RUN npm ci

USER node
CMD ["npm", "start"]
