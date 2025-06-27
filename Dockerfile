# Step 1: Use an official Node.js image as the build environment
FROM node:24-alpine AS builder

# Step 2: Set the working directory
WORKDIR /app

# Step 3: Copy package.json and package-lock.json
COPY package*.json ./

# Step 4: Install all dependencies (including devDependencies)
RUN npm install

# Step 5: Copy the rest of the application files
COPY . .

# Step 6: Build the Next.js app
RUN npm run build

# Step 7: Remove devDependencies for production
RUN npm prune --production

# Step 8: Use a smaller image for the final stage
FROM node:24-alpine AS runner
WORKDIR /app

# Step 9: Copy built app and node_modules from builder
COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/public /app/public
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/next.config.ts /app/next.config.ts

# Step 10: Expose the port the app will run on
EXPOSE 3000

# Step 11: Set the command to run the app
CMD ["npm", "start"]
