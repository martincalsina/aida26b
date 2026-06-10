FROM node:25-alpine

WORKDIR /app/frontend

# Copy package files first for better layer caching
COPY frontend/package.json frontend/package-lock.json* ./

# Install dependencies from the lockfile
RUN npm ci

# Copy source code
COPY frontend/src ./src
COPY frontend/styles ./styles
COPY frontend/index.html ./
COPY frontend/tsconfig.json ./
COPY frontend/webpack*.js ./
COPY tsconfig.base.json /app/tsconfig.base.json
COPY shared/src /app/shared/src

# Build the application
RUN npm run build

# Start the webpack development server with the API proxy
EXPOSE 8080
CMD ["npm", "run", "dev"]
