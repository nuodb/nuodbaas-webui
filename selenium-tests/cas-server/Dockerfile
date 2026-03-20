# (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /cas-server

FROM scratch
COPY --from=builder /cas-server /
CMD ["/cas-server"]