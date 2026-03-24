# Use official Node.js runtime as base image
FROM node:18-alpine

# Install better-sqlite3 dependencies
RUN apk add --no-cache python3 make g++

# Set working directory in container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set npm registry mirror to avoid timeouts
RUN npm config set registry https://registry.npmjs.org/ && \
    npm install --production --timeout=600000

# Copy application files
COPY . .

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
