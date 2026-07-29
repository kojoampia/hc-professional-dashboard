# Deploying professional.abofonsa.com (WP8)

This bundle makes `professional.abofonsa.com` serve the gateway-fronted stack:
nginx (Angular bundle + same-origin proxy) → `hcProfessionalGateway` (JWT
issuer, routes `/services/**` via Consul) → `professionalService`, with
MongoDB, Kafka, and Consul as shared infrastructure. TLS terminates at the
host's nginx (edge/), which proxies to the stack's single published port,
`127.0.0.1:5503`.

## 1. Build the images

Each repo builds its own image (all three scripts accept a version tag and
`PUSH=1` to tag/push to `docker-registry.jojoaddison.net`):

```bash
(cd ../../gateway && ./build-image.sh 1.0.0)          # hc-professional-gateway (Jib, needs JDK 26)
(cd ../../api     && ./build-image.sh 1.0.0)          # hc-professional-service (Jib, needs JDK 26)
docker build --network=host -f ../Dockerfile.prod -t hc-professional-dashboard:1.0.0 ..   # web (nginx; host network avoids npm stalls)
```

## 2. Prepare the server

```bash
sudo mkdir -p /opt/hc-professional && cd /opt/hc-professional
# copy this deploy/ directory here (compose file, central-server-config/, edge/, smoke.sh)
cp .env.example .env && chmod 600 .env
openssl rand -base64 64 | tr -d '\n'    # -> JWT_BASE64_SECRET in .env
```

Fill in `.env`: `JWT_BASE64_SECRET` (required — the gateway and the api MUST
share it; their in-repo prod defaults differ, so the stack never works without
it), `REGISTRY_PREFIX=docker-registry.jojoaddison.net/`, `IMAGE_TAG`, and the
SMTP settings if account emails should send.

## 3. Start the stack

```bash
docker compose -f docker-compose.professional.yml pull
docker compose -f docker-compose.professional.yml up -d
docker compose -f docker-compose.professional.yml ps    # wait for gateway: healthy
```

`consul-config-loader` pushes `central-server-config/application.yml` into
Consul KV on every start; the `${...}` placeholders in it resolve inside each
container from the `.env`-provided variables. Consul runs in `-dev` mode
(in-memory KV) — fine for this single-box stack because the loader re-seeds it
on every `up`.

## 4. Edge TLS + DNS

```bash
sudo cp edge/professional.abofonsa.com.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/professional.abofonsa.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d professional.abofonsa.com
```

DNS: `professional.abofonsa.com` → A/AAAA record for this server.

## 5. Verify (the WP8 gate)

```bash
./smoke.sh                                   # against https://professional.abofonsa.com
SMOKE_ADMIN_PASSWORD=... ./smoke.sh          # + JWT round-trip into the api via Consul
```

All checks green → the careers side can run its own verification
(`npx playwright test e2e/journeys.spec.ts -g "Journey 9"` from
`hc-abofonsa-web`) and flip `professionalPortalUrl` in the careers CMS —
per the contract, only after this.

## Update / rollback

```bash
# update: build + push new tag, then
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=1.0.1/' .env
docker compose -f docker-compose.professional.yml pull && docker compose -f docker-compose.professional.yml up -d

# rollback: set IMAGE_TAG back to the previous version and re-run the same two commands
```

MongoDB data lives in the named volume `hc-professional_mongodb-data` — images
can be swapped freely; the volume persists. Back it up with `mongodump` before
upgrades that touch domain contracts.

## First boot notes

- The gateway seeds authorities and demo users on first start
  (`InitialSetupMigration`); change the admin password immediately:
  log in as `admin` and use Account → Password.
- Health endpoints: `https://professional.abofonsa.com/management/health`
  (gateway, public); the api's health is internal-only (checked by compose).
