# Production Deployment Guide

## Overview

Production deployment uses a blue/green rollout driven by [production.yml](/D:/Fork/aeterna-chronicle-web/.github/workflows/production.yml).

Flow:

1. Validate server lint, typecheck, and unit tests.
2. Build and push `ghcr.io/<owner>/<repo>/etherna-server`.
3. Update `server-green` in Kubernetes.
4. Verify `GET /api/health`.
5. Switch traffic to green.

## Triggering a Release

Push a semantic version tag:

```bash
git tag v1.3.0
git push origin v1.3.0
```

Manual rollback is available through GitHub Actions `workflow_dispatch` or the local helper script:

```bash
./tools/deploy/rollback.sh v1.2.9
```

The rollback script derives the default GHCR repository from `origin`. Override it if needed:

```bash
IMAGE_NAME=my-org/my-repo/etherna-server ./tools/deploy/rollback.sh v1.2.9
```

## Kubernetes Resources

Production manifests live under [k8s/production](/D:/Fork/aeterna-chronicle-web/k8s/production).

- [server-deployment-blue.yaml](/D:/Fork/aeterna-chronicle-web/k8s/production/server-deployment-blue.yaml)
- [server-deployment-green.yaml](/D:/Fork/aeterna-chronicle-web/k8s/production/server-deployment-green.yaml)
- [ingress-production.yaml](/D:/Fork/aeterna-chronicle-web/k8s/production/ingress-production.yaml)
- [configmap-production.yaml](/D:/Fork/aeterna-chronicle-web/k8s/production/configmap-production.yaml)
- [secrets-production.yaml](/D:/Fork/aeterna-chronicle-web/k8s/production/secrets-production.yaml)
- [hpa-production.yaml](/D:/Fork/aeterna-chronicle-web/k8s/production/hpa-production.yaml)

All probes and smoke checks use `GET /api/health`.

## Required GitHub Secrets

- `KUBE_CONFIG_PRODUCTION`
- `SLACK_DEPLOY_WEBHOOK`
- `TEST_DATABASE_URL`

## Operational Notes

- The production image path is `ghcr.io/crisious/aeterna-chronicle-web/etherna-server` for the current repository.
- Static manifests use the same GHCR image path for initial deployment.
- Release archives are created by [release.yml](/D:/Fork/aeterna-chronicle-web/.github/workflows/release.yml).
