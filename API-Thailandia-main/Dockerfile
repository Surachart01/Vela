# Use Node.js 20 LTS Alpine image for a lightweight runtime
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package configuration files
COPY package*.json ./

# Install project dependencies
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose the API port
EXPOSE 4300

# Start the application
CMD [ "node", "app.js" ]
