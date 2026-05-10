FROM node:22 AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_WHISPER_SERVER_URL

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_WHISPER_SERVER_URL=$VITE_WHISPER_SERVER_URL

COPY package.json pnpm-lock.yaml* ./
RUN pnpm config set dangerously-allow-all-builds true && pnpm install
COPY . .
RUN pnpm build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Runtime env vars
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_WHISPER_SERVER_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_WHISPER_SERVER_URL=$VITE_WHISPER_SERVER_URL

ENV PORT=7860
ENV NODE_ENV=production
EXPOSE 7860
CMD ["node", ".output/server/index.mjs"]