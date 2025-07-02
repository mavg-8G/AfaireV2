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
ENV NODE_ENV=production
ENV PORT=3000

# Copy standalone build and static assets
COPY --from=builder /app/.next/standalone /app
COPY --from=builder /app/.next/static /app/.next/static
COPY --from=builder /app/public /app/public
COPY --from=builder /app/package.json /app/package.json

# Step 10: Expose the port the app will run on
EXPOSE 3000

# Step 11: Set the command to run the app
CMD ["node", "server.js"]
