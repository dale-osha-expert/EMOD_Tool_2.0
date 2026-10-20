# Self-hosted image for the EMOD funnel.
#
# Secrets (GEMINI_API_KEY, RESEND_API_KEY, EMAIL_FROM, ...) are runtime env and
# never baked in: the pages read them per request. Only NEXT_PUBLIC_ values are
# compiled into the client, so those are build args.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_SITE_URL=https://emodanalyzer.com
ARG NEXT_PUBLIC_AI_ENABLED=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_AI_ENABLED=$NEXT_PUBLIC_AI_ENABLED \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# The standalone bundle carries its own minimal node_modules; static assets and
# public/ are served by the same server and have to be copied in beside it.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
