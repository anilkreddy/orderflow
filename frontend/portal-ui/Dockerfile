FROM node:24.16.0-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=
ARG VITE_AUTH_URL=http://localhost:8180
ARG VITE_AUTH_REALM=oflio
ARG VITE_AUTH_CLIENT_ID=oflio-portal-ui
ARG VITE_REQUIRED_SCOPE=customer
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_AUTH_URL=${VITE_AUTH_URL}
ENV VITE_AUTH_REALM=${VITE_AUTH_REALM}
ENV VITE_AUTH_CLIENT_ID=${VITE_AUTH_CLIENT_ID}
ENV VITE_REQUIRED_SCOPE=${VITE_REQUIRED_SCOPE}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
