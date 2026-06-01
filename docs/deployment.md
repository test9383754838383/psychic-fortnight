# Deployment Guide — Vessel & Voyage Operations Control System (V1)

This document covers everything needed to deploy the production stack to a
single Linux host running Docker Compose. No Kubernetes, no ECS — plain
`docker compose` per ADR-0001.

---

## Environment Variable Reference

All configuration is injected at runtime via environment variables. **Never
commit `.env` files or any secrets to the repository.**

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Full async PostgreSQL URL — `postgresql+asyncpg://user:pass@db:5432/erp_ops` |
| `SESSION_SECRET_KEY` | ✅ | Random 32-byte secret used to sign session tokens. Generate with `openssl rand -hex 32`. |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for LLM-backed features. |
| `POSTGRES_DB` | ✅ | PostgreSQL database name (consumed by the `db` service). |
| `POSTGRES_USER` | ✅ | PostgreSQL superuser username (consumed by the `db` service). |
| `POSTGRES_PASSWORD` | ✅ | PostgreSQL superuser password (consumed by the `db` service). |
| `VITE_API_BASE_URL` | Build-time | Base URL for API calls baked into the frontend bundle at CI build time. Set as a **GitHub Actions variable** (`vars.VITE_API_BASE_URL`), not a secret. Example: `https://ops.yourdomain.com`. |
| `DOMAIN` | Required | Your public domain name, read by Caddy via `{$DOMAIN}` in the Caddyfile. Example: `ops.yourdomain.com`. |
| `IMAGE_REPOSITORY` | Required | Lowercase GHCR repository prefix used by Compose. Example: `ghcr.io/your_org/erp_operations`. |

---

## Secrets Management

> **Never commit `.env` files or any file containing secrets to the repository.**

### Recommended approach

1. **Production host**: Create `/etc/erp-ops/erp-ops.env` (mode `600`, owned
   by the deploy user), then reference it in your systemd unit or the Compose
   invocation:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file /etc/erp-ops/erp-ops.env up -d
   ```

2. **Docker Secrets** (Swarm mode): Use `docker secret create` for
   `SESSION_SECRET_KEY`, `OPENAI_API_KEY`, and `POSTGRES_PASSWORD`. Update the
   Compose file to use the `secrets:` key — no changes to application code
   required because FastAPI reads from env.

3. **External secrets manager** (Vault, AWS Secrets Manager, etc.): Inject
   secrets into the environment via your secrets manager's Docker integration
   (e.g., `aws secretsmanager get-secret-value` in an entrypoint wrapper, or
   the Vault agent sidecar pattern).

In all cases: **`POSTGRES_PASSWORD` and `SESSION_SECRET_KEY` must be unique,
randomly generated, and rotated if ever exposed.**

---

## Caddy Domain Configuration

The `Caddyfile` reads the domain from the `DOMAIN` environment variable:

```
{$DOMAIN} {
    ...
}
```

Set `DOMAIN=ops.yourdomain.com` in your environment file before starting the
stack. Caddy handles ACME (Let's Encrypt) certificate provisioning and renewal
automatically — no cert management scripts needed.

### Air-gapped / offline installs

For installations without internet access (no Let's Encrypt), replace the
automatic TLS block with a manual certificate path as documented in **ADR-0015**:

```
ops.yourdomain.com {
    tls /path/to/cert.pem /path/to/key.pem
    encode gzip
    ...
}
```

Place your certificate and key files on the host and mount them into the Caddy
container, or copy them directly into the image.

---

## First-Boot Checklist

Follow these steps exactly, in order, on a fresh server.

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_ORG/ERP_Operations.git /opt/erp-ops
cd /opt/erp-ops

# 2. Set environment variables
#    Create the env file (keep mode 600)
cat > /etc/erp-ops/erp-ops.env << 'EOF'
DATABASE_URL=postgresql+asyncpg://erp_ops_user:CHANGE_ME@db:5432/erp_ops
SESSION_SECRET_KEY=CHANGE_ME_32_BYTE_HEX
OPENAI_API_KEY=sk-...
POSTGRES_DB=erp_ops
POSTGRES_USER=erp_ops_user
POSTGRES_PASSWORD=CHANGE_ME
DOMAIN=ops.yourdomain.com
IMAGE_REPOSITORY=ghcr.io/your_org/erp_operations
EOF
chmod 600 /etc/erp-ops/erp-ops.env

# 3. Start all services
docker compose -f docker-compose.prod.yml --env-file /etc/erp-ops/erp-ops.env up -d

# 4. Run database migrations (first boot only)
docker compose -f docker-compose.prod.yml exec api \
  /app/.venv/bin/alembic upgrade head

# 5. Verify the health endpoint
curl http://localhost/health
# Expected: {"status":"ok","db":"ok"}

# 6. Point DNS to this server's public IP
#    A record: ops.yourdomain.com → <SERVER_IP>
#    Caddy will auto-provision the TLS certificate within ~30 seconds.
```

---

## How to Update (Rolling Image Pull)

When a new commit merges to `main`, CI automatically builds and pushes new
images tagged `:latest` and `:<git-sha>` to ghcr.io. To deploy:

```bash
# Pull the new image layers
docker compose -f docker-compose.prod.yml pull

# Restart services with zero-downtime rolling update
docker compose -f docker-compose.prod.yml up -d

# If the update includes database migrations, run:
docker compose -f docker-compose.prod.yml exec api \
  /app/.venv/bin/alembic upgrade head
```

To pin to a specific SHA instead of `:latest`, set the image tags explicitly in
an override file:

```bash
# docker-compose.override.prod.yml
services:
  api:
    image: ghcr.io/your_org/erp_operations/api:<SHA>
  frontend:
    image: ghcr.io/your_org/erp_operations/frontend:<SHA>
```

---

## Manual Smoke Test (Runbook)

After every deployment, confirm the stack is healthy:

```bash
# Stack up
docker compose -f docker-compose.prod.yml up -d

# Health check — expects HTTP 200 with JSON body
curl -s http://localhost/health | python3 -m json.tool
# Expected output:
# {
#     "status": "ok",
#     "db": "ok"
# }

# Caddy TLS (after DNS propagation)
curl -s https://ops.yourdomain.com/health | python3 -m json.tool
```

A non-`200` response or `"db": "error"` means the database connection failed.
Check `docker compose logs api` and `docker compose logs db`.

---

## CI Gate: `build-and-push`

The `build-and-push` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

- **Triggers**: push to `main` only (not PRs).
- **Depends on**: lint/typecheck, backend tests, Postgres migration smoke, and
  frontend tests must be green first.
- **Permissions**: `packages: write` on `GITHUB_TOKEN` — no extra PAT needed.
- **Artifacts**: `ghcr.io/<org>/erp_operations/api:latest`, `api:<sha>`,
  `frontend:latest`, `frontend:<sha>`.
- **Layer cache**: GitHub Actions cache (`type=gha`) speeds up subsequent builds.

The job is the CI gate for deployment readiness. A red `build-and-push` on
`main` means the image is not deployed.
