FROM node:alpine as build-stage

WORKDIR /app
COPY package.json ./
RUN apk add --update --no-cache build-base python3
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine-slim
COPY --from=build-stage /app/dist /usr/share/nginx/html
