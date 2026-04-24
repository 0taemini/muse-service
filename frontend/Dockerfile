FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm ci

COPY . .

RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache tzdata
ENV TZ=Asia/Seoul

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
