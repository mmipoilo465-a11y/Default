FROM node:22-alpine
RUN apk add --no-cache tzdata
WORKDIR /app
COPY . .
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "--no-warnings", "server.js"]
