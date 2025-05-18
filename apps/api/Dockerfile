# Use Node.js LTS version
FROM node:18-alpine

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    sqlite-dev \
    zlib-dev \
    build-base \
    bash

# Install tippecanoe
RUN git clone https://github.com/felt/tippecanoe.git && \
    cd tippecanoe && \
    make -j$(nproc) && \
    make install && \
    cd .. && \
    rm -rf tippecanoe

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Rebuild bcrypt for Alpine Linux
RUN npm rebuild bcrypt --build-from-source

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev"] 