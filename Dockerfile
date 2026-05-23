FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
EXPOSE 3000
CMD ["node", "dist/main.js"]
