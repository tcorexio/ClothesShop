FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install 

COPY . . 

RUN npm run build && ls -la dist 

EXPOSE 3000 

CMD ["node","dist/src/main"]

