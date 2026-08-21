FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma
COPY src ./src
COPY prisma.config.ts ./

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]