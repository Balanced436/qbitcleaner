FROM alpine:latest
WORKDIR /app
COPY . .

RUN apk update && \
    apk add --no-cache \
    nodejs \
    npm

RUN npm install
RUN chmod +x entrypoint.sh

RUN apk update && \
    apk add --no-cache \
    ca-certificates \
    curl \
    gnupg \
    bash \
    jq \
    docker-cli \
    icu-libs \
    krb5-libs \
    libgcc \
    libintl \
    libssl3 \
    libstdc++ \
    zlib \
    gzip \
    tar

ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]