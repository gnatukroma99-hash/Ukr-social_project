FROM node:24-bookworm-slim
WORKDIR /srv/svoie
COPY app/data.mjs app/engine.mjs ./app/
COPY server/*.mjs ./server/
ENV HOST=0.0.0.0 PORT=4387 DB_PATH=/data/svoie.sqlite
EXPOSE 4387
CMD ["node", "server/index.mjs"]
