# Minimal Go CAS server

This is a tiny, intentionally-incomplete CAS-like server for local testing and demos.

Endpoints:

- `GET /login?service=...` - show a simple login form
- `POST /login` - accept `username`, `password`, and optional `service` form values. It issues a ticket and redirects to the `service` URL with `ticket=...` appended.
- `GET /validate?ticket=...` - simple CAS v1-style validation; response is two lines: `yes`/`no` then username (or blank).
 - `GET /validate?ticket=...` - simple CAS v1-style validation; response is two lines: `yes`/`no` then username (or blank).
 - `GET /serviceValidate?service=...&ticket=...` - CAS XML `serviceValidate` response. Returns XML with `<cas:authenticationSuccess>` and `<cas:user>` when ticket is valid, or `<cas:authenticationFailure>` when invalid.

Run locally:

```bash
cd cas-server
go run .
# or set PORT
PORT=8081 go run .
```

Example flow:

1. POST to `/login` with form values `username`, `password`, `service=http://localhost:9999/return`
2. The server redirects to `http://localhost:9999/return?ticket=ST-...`
3. A client (or test) calls `/validate?ticket=ST-...` and the server responds:

```
yes
<username>
```

Notes:

- This server is intentionally minimal and not secure. Do not use in production.
- Tickets are stored in memory and are not expired or revoked automatically.
