# (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

FROM node:22-alpine AS build-ui
WORKDIR /app/
ARG REACT_APP_GIT_SHA
COPY ui/ /app/
RUN npm install
RUN npm run build

FROM golang:1.26-alpine AS build-server-multiplatform
RUN apk add --no-cache tar
WORKDIR /app
COPY static_server/go.mod ./
RUN go mod download
COPY static_server .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-w -s" -o /ui-server-arm64 .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /ui-server-amd64 .
WORKDIR /
COPY --from=build-ui /app/build /static/ui/

FROM alpine AS build-server
COPY --from=build-server-multiplatform /ui-server-arm64 /ui-server-amd64 /
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
    mv /ui-server-arm64 /ui-server; \
    elif [ "$ARCH" = "x86_64" ] || [ "$ARCH" = "amd64" ]; then \
    mv /ui-server-amd64 /ui-server; \
    else \
    echo "Unsupported architecture: $ARCH" && exit 1; \
    fi

FROM alpine
COPY --from=build-ui /app/build /static/ui/
COPY --from=build-server /ui-server /
COPY docker/production/files/ /
HEALTHCHECK --interval=1s --timeout=3s --start-period=5s --retries=3 CMD [ "curl", "http://localhost/" ]
EXPOSE 8080
ENTRYPOINT [ "/entrypoint.sh" ]
