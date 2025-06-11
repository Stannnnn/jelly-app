# Build the program
FROM node:22 AS builder

WORKDIR /app

# Install packages
COPY package.json .
COPY *.lock .

RUN yarn install

# Copy source
COPY . .

# Variables
ARG NODE_ENV=production

ENV NODE_ENV=$NODE_ENV

# Build application
RUN yarn build

# Serves with nginx
FROM nginx:mainline-alpine AS server

COPY --from=builder /app/dist /usr/share/nginx/html
