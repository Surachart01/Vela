# ==========================================
# Stage 1: Build the Angular application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package configurations
COPY package*.json ./

# Install all dependencies (including devDependencies required for compiling Angular)
RUN npm install

# Copy source files
COPY . .

# Build Angular app in production mode so it connects to the production backend URL
RUN npx ng build --configuration production

# Prune devDependencies to keep only production dependencies in node_modules
RUN npm prune --omit=dev

# ==========================================
# Stage 2: Serve the application via Express
# ==========================================
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy production node_modules from builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy built frontend assets from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Copy the backend express server script that serves static files
COPY server.js ./

# Expose port
EXPOSE 8080

# Run express server
CMD [ "node", "server.js" ]
