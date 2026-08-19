# syntax=docker/dockerfile:1.7

FROM node:24.15.0-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM dependencies AS test
COPY . .
RUN npm run config && npm test -- --watch=false

FROM dependencies AS build
COPY . .
RUN --mount=type=secret,id=supabase_url,required=true \
    --mount=type=secret,id=supabase_key,required=true \
    SUPABASE_URL="$(cat /run/secrets/supabase_url)" && \
    SUPABASE_KEY="$(cat /run/secrets/supabase_key)" && \
    test -n "$SUPABASE_URL" && \
    test -n "$SUPABASE_KEY" && \
    export SUPABASE_URL SUPABASE_KEY && \
    npm run build

FROM nginxinc/nginx-unprivileged:1.30-alpine@sha256:44e36330f74d4f3a1d4e222acca9e23b401fb87811a7597024502bb759c4dd49 AS runtime

COPY --from=build --chown=101:101 /app/dist/refuel-control/browser /usr/share/nginx/html
COPY --chown=101:101 deploy/nginx.conf /etc/nginx/conf.d/default.conf

USER 101:101
RUN nginx -t
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]
