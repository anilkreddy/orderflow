FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=
ARG VITE_ADMIN_EMAIL=admin@orderflow.local
ARG VITE_ADMIN_PASSWORD=OrderFlow!Admin123
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_ADMIN_EMAIL=${VITE_ADMIN_EMAIL}
ENV VITE_ADMIN_PASSWORD=${VITE_ADMIN_PASSWORD}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
