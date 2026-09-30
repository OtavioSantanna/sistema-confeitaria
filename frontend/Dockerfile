FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
# Usa o lockfile se existir (build reproduzível); senão, npm install.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]
