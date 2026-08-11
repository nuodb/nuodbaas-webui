# (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

FROM node:22-alpine AS build-ui
WORKDIR /app/
ARG REACT_APP_GIT_SHA
COPY ui/ /app/
RUN npm install
RUN npm run build

FROM golang:1.24-alpine AS build-server
WORKDIR /app
COPY static_server/go.mod ./
RUN go mod download
COPY static_server .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /ui-server .

FROM alpine
RUN apk add --no-cache tar
COPY --from=build-ui /app/build /static/ui/
COPY --from=build-server /ui-server /
HEALTHCHECK --interval=1s --timeout=3s --start-period=5s --retries=3 CMD [ "curl", "http://localhost/" ]
EXPOSE 8080
ENTRYPOINT [ "/ui-server" ]
