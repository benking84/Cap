# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable
ENV NODE_ENV=production

# ---------- Builder ----------
FROM base AS builder
WORKDIR /app

# Copy only what's needed for a deterministic install cache
# If you have pnpm-workspace.yaml, include it; if you don't, this is still fine.
COPY package.json pnpm-workspace.yaml* pnpm-lock.yaml* ./
# Also copy the package manifests for web + database so pnpm knows them
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/

# Install without requiring a lockfile (repo currently missing one in Cloud Build)
RUN corepack enable pnpm && pnpm install --no-frozen-lockfile

# Now bring in source
COPY . .

# App build env; adjust if your app needs different public vars at build time
ARG NEXT_PUBLIC_DOCKER_BUILD=true
ENV NEXT_PUBLIC_DOCKER_BUILD=$NEXT_PUBLIC_DOCKER_BUILD
ENV NEXT_PUBLIC_WEB_URL=http://localhost:3000
ENV NEXT_PUBLIC_CAP_AWS_BUCKET=capso
ENV NEXT_PUBLIC_CAP_AWS_REGION=us-east-1

# Build the web app (uses turborepo script in monorepo)
RUN pnpm run build:web

# ---------- Runner ----------
FROM base AS runner
WORKDIR /app

# Create unprivileged user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy the Next.js standalone output + static + public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# (Optional) if your app reads SQL migrations at runtime, keep this
COPY --from=builder --chown=nextjs:nodejs /app/packages/database/migrations ./apps/web/migrations

USER nextjs
EXPOSE 3000

# Next.js standalone outputs server.js in the project root path above
CMD HOSTNAME="0.0.0.0" node apps/web/server.js
