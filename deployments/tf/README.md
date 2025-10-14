# Terraform Deployment

Terraform infrastructure for deploying Smart Order Router to Google Cloud Run.

## Overview

- **Workspace-based** environment management (`dev` and `prod`)
- **Single tfvars file** for all configuration
- **Native Terraform** commands (no complex wrapper scripts)

## Quick Start

```bash
# Configure
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Setup
./workspace.sh setup

# Deploy
terraform workspace select dev
terraform apply
```

## Files

```
├── backend.tf              # GCS backend configuration
├── main.tf                 # Cloud Run service definition
├── variables.tf            # Variable definitions
├── terraform.tfvars        # Configuration (gitignored)
├── terraform.tfvars.example # Template
├── workspace.sh            # Helper script (optional)
├── README.md               # This file
└── SETUP_SECRETS.md        # Secret Manager setup
```

## Configuration

### terraform.tfvars

Single file for both environments:

```hcl
# Project
project_id = "your-project-id"
image_registry = "region-docker.pkg.dev/project/repo/smart-order-router"
service_account_email = "service-account@project.iam.gserviceaccount.com"

# Development
image_tag_dev = "latest"
dev_min_instances = 0
dev_ingress = "INGRESS_TRAFFIC_ALL"
dev_allow_unauthenticated = true

# Production
image_tag_prod = "sha256:abc..."
prod_min_instances = 1
prod_ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"
prod_allow_unauthenticated = false
prod_authorized_members = ["serviceAccount:..."]
```

## Commands

### Native Terraform

```bash
# Initialize
terraform init

# Create workspaces
terraform workspace new dev
terraform workspace new prod

# Switch workspace
terraform workspace select dev

# Deploy
terraform plan
terraform apply

# View outputs
terraform output
```

### Helper Script (Optional)

```bash
./workspace.sh setup       # One-time initialization
./workspace.sh switch dev  # Switch workspace
./workspace.sh import dev  # Import existing service
```

## Workspaces

- **`dev`** - Development environment (public, scales to zero)
- **`prod`** - Production environment (internal, always running)

Workspace name determines which `*_dev` or `*_prod` variables are used.

## Backend

State stored in GCS:

```hcl
backend "gcs" {
  bucket = "YOUR_STATE_BUCKET"
  prefix = "terraform/state/smart-order-router"
}
```

State files:
- `gs://bucket/prefix/env:dev/default.tfstate`
- `gs://bucket/prefix/env:prod/default.tfstate`

## Secrets

Required: `SMART_ORDER_ROUTER_INFURA_API_KEY`

See [SETUP_SECRETS.md](./SETUP_SECRETS.md) for setup instructions.

## Environment Differences

| Feature | Dev | Prod |
|---------|-----|------|
| **Min Instances** | 0 | 1 |
| **Max Instances** | 5 | 20 |
| **Ingress** | Public | Internal |
| **Auth** | Not required | Required |

## Import Existing Service

```bash
terraform workspace select dev
terraform import google_cloud_run_v2_service.smart_order_router \
  projects/PROJECT_ID/locations/REGION/services/smart-order-router-dev
```

Or use: `./workspace.sh import dev`

## Troubleshooting

**Wrong workspace**: Run `terraform workspace show` to verify

**State locked**: Run `terraform force-unlock LOCK_ID`

**Permission denied**: Verify service account has Cloud Run Admin role

## Documentation

- [Complete Deployment Guide](../../app/docs/DEPLOYMENT.md) - Full deployment documentation
- [Secret Setup](./SETUP_SECRETS.md) - Secret Manager configuration
- [API Specification](../../app/docs/openapi.yaml) - OpenAPI documentation
