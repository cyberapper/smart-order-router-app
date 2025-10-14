# Deployment Guide

Complete guide for deploying the Smart Order Router to Google Cloud Run.

## Overview

The Smart Order Router is deployed using:
- **Docker** for containerization (with pnpm)
- **Terraform** for infrastructure (workspace-based)
- **Google Cloud Run** for serverless execution
- **Google Secret Manager** for secrets (Infura API key)

## Prerequisites

1. **Google Cloud SDK** - `gcloud auth application-default login`
2. **Terraform >= 1.0** - Infrastructure as code
3. **Docker** - Container builds
4. **pnpm** - Package manager (handled in Dockerfile)
5. **GCP Project** with APIs enabled:
   - Cloud Run API
   - Artifact Registry API
   - Secret Manager API

## Quick Start

### 1. Setup Secrets

Create the required Infura API key secret:

```bash
# Create secret
echo -n "your-infura-api-key" | gcloud secrets create SMART_ORDER_ROUTER_INFURA_API_KEY \
  --project=YOUR_PROJECT_ID \
  --replication-policy="automatic" \
  --data-file=-

# Grant access to Cloud Run service account
gcloud secrets add-iam-policy-binding SMART_ORDER_ROUTER_INFURA_API_KEY \
  --project=YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 2. Build and Push Image

```bash
# Build with Docker
docker build -t smart-order-router .

# Tag for Artifact Registry
docker tag smart-order-router \
  REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/smart-order-router:TAG

# Push
docker push REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/smart-order-router:TAG
```

### 3. Deploy with Terraform

```bash
cd deployments/tf

# Configure terraform.tfvars (see example file)
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Setup
./workspace.sh setup

# Deploy to development
terraform workspace select dev
terraform apply

# Deploy to production
terraform workspace select prod
terraform apply
```

## Docker

### Building

The Dockerfile uses pnpm for package management:

```dockerfile
# Multi-stage build with pnpm
FROM node:18-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

# Build Next.js app
WORKDIR /app/app
RUN pnpm install --frozen-lockfile
RUN pnpm run build

# Production image
FROM node:18-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app/app/.next ./.next
CMD ["pnpm", "start"]
```

### Local Testing

```bash
docker run -p 8080:8080 \
  -e NODE_ENV=development \
  -e INFURA_API_KEY=your-key \
  smart-order-router
```

Health check: `http://localhost:8080/api/health`

## Terraform Infrastructure

### Architecture

Uses **Terraform Workspaces** for environment isolation:
- Single `terraform.tfvars` file for all configuration
- Workspace name determines environment (`dev` or `prod`)
- Environment-specific variables (`dev_*`, `prod_*`)

### Configuration

Edit `deployments/tf/terraform.tfvars`:

```hcl
# Project (required)
project_id = "your-gcp-project-id"
image_registry = "region-docker.pkg.dev/project-id/repo/smart-order-router"
service_account_email = "service-account@project-id.iam.gserviceaccount.com"

# Development
image_tag_dev = "latest"
dev_min_instances = 0                          # Scales to zero
dev_ingress = "INGRESS_TRAFFIC_ALL"           # Public access
dev_allow_unauthenticated = true               # No auth required

# Production
image_tag_prod = "sha256:abc..."               # Use digest
prod_min_instances = 1                         # Always running
prod_ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY" # Internal only
prod_allow_unauthenticated = false             # Auth required
prod_authorized_members = [
  "serviceAccount:service@project.iam.gserviceaccount.com"
]
```

### Deployment Commands

```bash
# Setup (one-time)
terraform init
terraform workspace new dev
terraform workspace new prod

# Or use helper script
./workspace.sh setup

# Deploy to development
terraform workspace select dev
terraform plan
terraform apply

# Deploy to production
terraform workspace select prod
terraform plan
terraform apply

# View service URL
terraform output service_url
```

### Helper Script (Optional)

`workspace.sh` provides shortcuts but is completely optional:

```bash
./workspace.sh setup         # Initialize and create workspaces
./workspace.sh switch dev    # Switch to workspace
./workspace.sh import dev    # Import existing service
```

## Environment Comparison

| Feature | Development | Production |
|---------|-------------|------------|
| **Workspace** | `dev` | `prod` |
| **Service Name** | `smart-order-router-dev` | `smart-order-router-prod` |
| **Ingress** | Public | Internal only |
| **Authentication** | Not required | Required |
| **Min Instances** | 0 (scales to zero) | 1 (always running) |
| **Max Instances** | 5 | 20 |
| **Image Tag** | `latest` | SHA256 digest |
| **Access** | `allUsers` | Authorized members only |

## Secrets Management

### Required Secrets

**INFURA_API_KEY** - Required for blockchain RPC access

Secret name: `SMART_ORDER_ROUTER_INFURA_API_KEY`  
Automatically injected as environment variable by Cloud Run.

See [`deployments/tf/SETUP_SECRETS.md`](../../deployments/tf/SETUP_SECRETS.md) for detailed setup.

## Monitoring

### Logs

```bash
# Development
gcloud run services logs read smart-order-router-dev \
  --region=asia-east1 \
  --project=YOUR_PROJECT_ID

# Production
gcloud run services logs read smart-order-router-prod \
  --region=asia-east1 \
  --project=YOUR_PROJECT_ID
```

### Health Check

```bash
# Get service URL
terraform output service_url

# Check health
curl https://SERVICE_URL/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-14T12:00:00.000Z",
  "uptime": 123.45,
  "service": "smart-order-router-api",
  "version": "0.1.0"
}
```

## Troubleshooting

### Build Issues

**Problem**: Docker build fails

```bash
# Check Node version compatibility
node --version  # Should be compatible with Node 18

# Clear Docker cache
docker system prune -a
```

### Deployment Issues

**Problem**: Wrong workspace selected

```bash
# Check current workspace
terraform workspace show

# Switch to correct workspace
terraform workspace select dev
```

**Problem**: Image not found

```bash
# List images in registry
gcloud artifacts docker images list \
  REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY
```

**Problem**: Permission denied

```bash
# Verify service account permissions
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:YOUR_SA"
```

### Runtime Issues

**Problem**: Service fails health checks

```bash
# Check logs
gcloud run services logs read SERVICE_NAME --region=REGION --limit=50

# Verify secret access
gcloud secrets get-iam-policy SMART_ORDER_ROUTER_INFURA_API_KEY
```

## CI/CD Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Authenticate to GCP
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Build and Push
        run: |
          docker build -t smart-order-router .
          docker tag smart-order-router $IMAGE_URL
          docker push $IMAGE_URL
      
      - name: Deploy
        run: |
          cd deployments/tf
          terraform init
          terraform workspace select prod
          terraform apply -auto-approve
```

## Rollback

### Cloud Run Revision Rollback

```bash
# List revisions
gcloud run revisions list \
  --service=smart-order-router-prod \
  --region=asia-east1

# Rollback to previous revision
gcloud run services update-traffic smart-order-router-prod \
  --region=asia-east1 \
  --to-revisions=REVISION_NAME=100
```

### Terraform Rollback

```bash
# Update image_tag_prod in terraform.tfvars to previous version
terraform workspace select prod
terraform apply
```

## Best Practices

1. **Use SHA256 digests for production** - Immutable, reproducible deployments
2. **Test in dev first** - Always validate changes in development
3. **Verify workspace** - Run `terraform workspace show` before applying
4. **Monitor after deployment** - Check logs and health endpoints
5. **Keep secrets in Secret Manager** - Never commit secrets to code

## File Structure

```
smart-order-router/
├── Dockerfile                    # Container definition
├── .dockerignore                 # Docker build exclusions
├── app/
│   ├── docs/
│   │   ├── openapi.yaml         # API specification
│   │   └── DEPLOYMENT.md        # This file
│   └── src/pages/api/
│       ├── health.ts            # Health check endpoint
│       └── smartrouter/         # API routes
└── deployments/
    └── tf/
        ├── backend.tf           # GCS backend
        ├── main.tf              # Resource definitions
        ├── variables.tf         # Variable definitions
        ├── terraform.tfvars     # Configuration (gitignored)
        ├── terraform.tfvars.example  # Template
        ├── workspace.sh         # Helper script
        ├── README.md            # Terraform guide
        └── SETUP_SECRETS.md     # Secret setup
```

## Additional Resources

- [Terraform README](../../deployments/tf/README.md) - Detailed Terraform guide
- [OpenAPI Specification](./openapi.yaml) - API documentation
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Terraform Workspaces](https://www.terraform.io/docs/language/state/workspaces.html)

## Support

For issues:
1. Check logs: `gcloud run services logs read SERVICE_NAME`
2. Verify workspace: `terraform workspace show`
3. Review Terraform plan: `terraform plan`
4. Check service quotas in GCP Console

