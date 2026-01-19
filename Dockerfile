FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install 

COPY . . 

RUN npm run build && ls -la dist 

EXPOSE 3000 

CMD ["node","dist/src/main"]

