FROM node:24.8.0-alpine3.21 AS build

# Set working directory
WORKDIR /app

# Copy the source code
COPY . .

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build

# RUNTIME STAGE
FROM node:24.8.0-alpine3.21

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json /app/
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copy the built application
COPY --from=build --chown=node:node /app/dist /app/dist

# Run image as non-root user
USER node

# Start the application
CMD ["node", "dist/index.js"]
