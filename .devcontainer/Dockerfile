FROM node:24-bookworm

# Instalar herramientas de desarrollo esenciales
RUN apt-get update && apt-get install -y \
    git \
    curl \
    procps \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# El usuario 'node' ya viene en la imagen oficial de Node
USER node

WORKDIR /workspace
