FROM node:20-bullseye

WORKDIR /app
RUN corepack enable

# Copy the whole repo so pnpm workspaces resolve
COPY . .

# Install workspace deps
RUN pnpm install --no-frozen-lockfile

# Move to the database package
WORKDIR /app/packages/database

# Ensure script is executable (it already exists here)
RUN chmod +x entrypoint.sh

USER node
ENTRYPOINT ["./entrypoint.sh"]
