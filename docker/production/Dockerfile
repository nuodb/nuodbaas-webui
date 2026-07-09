# (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

FROM node:22-alpine AS build-ui
WORKDIR /app/
ARG REACT_APP_GIT_SHA
COPY ui/ /app/
RUN npm install
RUN npm run build

FROM golang:1.26-alpine AS build-instances
WORKDIR /app
COPY ui-server/go.mod /app/
RUN go mod download
COPY ui-server/main.go /app/
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /ui-server .

FROM nginx:alpine
COPY --from=build-ui /app/build /usr/share/nginx/html/ui/
COPY --from=build-instances /ui-server /ui-server
RUN cp /usr/share/nginx/html/ui/index.html /usr/share/nginx/html/
COPY docker/production/files/ /
HEALTHCHECK --interval=1s --timeout=3s --start-period=5s --retries=3 CMD [ "curl", "http://localhost/" ]
EXPOSE 80
ENTRYPOINT [ "/entrypoint.sh" ]
