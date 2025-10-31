# syntax=docker/dockerfile:1

FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
# Optional: pass API base for Vite at build time
ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE}
COPY src ./src
COPY knexfile.js ./knexfile.js
RUN npm run build:frontend

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/src ./src
COPY --from=build /app/knexfile.js ./knexfile.js
ENV PORT=3000
EXPOSE 3000
CMD ["node", "src/app.js"]