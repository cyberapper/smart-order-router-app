# Secret Manager Setup Guide

This guide explains how to set up the required secrets for the Smart Order Router application.

## Required Secrets

### NEXT_PUBLIC_INFURA_API_KEY

The Smart Order Router requires an Infura API key to access blockchain data via RPC endpoints across multiple chains (Ethereum, Polygon, Base, Optimism, Arbitrum, etc.).

## Setup Instructions

### 1. Create the Secret

If the secret doesn't already exist, create it:

```bash
# Set your project ID
PROJECT_ID="366919210753"  # or your project ID

# Create the secret with your Infura API key
echo -n "your-infura-api-key-here" | gcloud secrets create SMART_ORDER_ROUTER_NEXT_PUBLIC_INFURA_API_KEY \
  --project=$PROJECT_ID \
  --replication-policy="automatic" \
  --data-file=-
```

### 2. Verify the Secret

```bash
# List secret versions
gcloud secrets versions list SMART_ORDER_ROUTER_NEXT_PUBLIC_INFURA_API_KEY \
  --project=$PROJECT_ID

# Verify secret exists
gcloud secrets describe SMART_ORDER_ROUTER_NEXT_PUBLIC_INFURA_API_KEY \
  --project=$PROJECT_ID
```

### 3. Grant Access to Cloud Run Service Account

Your Cloud Run service needs permission to access the secret:

```bash
# Replace with your actual service account email
SERVICE_ACCOUNT="your-service-account@your-project.iam.gserviceaccount.com"

# Grant secret accessor role
gcloud secrets add-iam-policy-binding SMART_ORDER_ROUTER_NEXT_PUBLIC_INFURA_API_KEY \
  --project=$PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"
```

### 4. Verify IAM Permissions

```bash
# Check IAM policy for the secret
gcloud secrets get-iam-policy SMART_ORDER_ROUTER_NEXT_PUBLIC_INFURA_API_KEY \
  --project=$PROJECT_ID
```

You should see your service account listed with the `roles/secretmanager.secretAccessor` role.

## Updating the Secret

If you need to update the Infura API key:

```bash
# Add a new version of the secret
echo -n "new-infura-api-key-here" | gcloud secrets versions add SMART_ORDER_ROUTER_NEXT_PUBLIC_INFURA_API_KEY \
  --project=$PROJECT_ID \
  --data-file=-
```

The Cloud Run service will automatically use the latest version (or the version specified in your Terraform configuration).

## Terraform Configuration

The secret is already configured in the example tfvars files:

**main.tf**:
```hcl
env {
  name = "NEXT_PUBLIC_INFURA_API_KEY"
  value_source {
    secret_key_ref {
      secret  = "SMART_ORDER_ROUTER_NEXT_PUBLIC_INFURA_API_KEY"
      version = "latest"
    }
  }
}
```

## Troubleshooting

### Issue: "Permission denied accessing secret"

**Cause**: Service account doesn't have access to the secret.

**Solution**: 
```bash
gcloud secrets add-iam-policy-binding SMART_ORDER_ROUTER_NEXT_PUBLIC_INFURA_API_KEY \
  --project=$PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"
```

### Issue: "Secret not found"

**Cause**: Secret doesn't exist in the project.

**Solution**: Create the secret following Step 1 above.

### Issue: "Cloud Run service can't start"

**Possible causes**:
1. Secret doesn't exist
2. Service account lacks permission
3. Secret name mismatch in Terraform config

**Solution**: 
1. Verify secret exists: `gcloud secrets describe SMART_ORDER_ROUTER_NEXT_PUBLIC_INFURA_API_KEY --project=$PROJECT_ID`
2. Check IAM permissions: `gcloud secrets get-iam-policy SMART_ORDER_ROUTER_NEXT_PUBLIC_INFURA_API_KEY --project=$PROJECT_ID`
3. Verify Terraform config matches secret name exactly

## Getting an Infura API Key

If you don't have an Infura API key:

1. Go to [https://infura.io](https://infura.io)
2. Sign up for a free account
3. Create a new project
4. Copy the API key from your project settings
5. Add it to Secret Manager following the steps above

## Security Best Practices

1. **Never commit secrets to version control** - Always use Secret Manager
2. **Use least privilege** - Only grant access to service accounts that need it
3. **Rotate keys regularly** - Update the secret periodically
4. **Use separate keys** - Consider using different Infura projects/keys for dev and prod
5. **Monitor usage** - Check Infura dashboard for API usage and potential issues

## Additional Resources

- [GCP Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Infura Documentation](https://docs.infura.io/)
- [Cloud Run Secrets](https://cloud.google.com/run/docs/configuring/secrets)

