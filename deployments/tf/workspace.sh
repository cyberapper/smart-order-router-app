#!/bin/bash

# Terraform Workspace Management for Smart Order Router
# This script simplifies workspace operations while keeping native Terraform commands usable

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    echo -e "${1}${2}${NC}"
}

show_usage() {
    cat << EOF
Usage: $0 <command> [environment]

Commands:
    setup                 - Initialize Terraform and create workspaces
    switch <env>          - Switch to a workspace (dev/prod)
    list                  - List all workspaces
    current               - Show current workspace
    import <env>          - Import existing Cloud Run service
    delete <env>          - Delete a workspace
    
Environments:
    dev                   - Development environment
    prod                  - Production environment

Examples:
    $0 setup              # One-time setup
    $0 switch dev         # Switch to dev workspace
    $0 import prod        # Import existing prod service
    
After setup, use native Terraform commands:
    terraform plan        # Plan changes for current workspace
    terraform apply       # Apply changes for current workspace
    terraform workspace select dev    # Switch workspace
EOF
}

check_terraform_init() {
    if [ ! -d ".terraform" ]; then
        print_message $RED "Error: Terraform not initialized. Run '$0 setup' first."
        exit 1
    fi
}

case "${1:-}" in
    setup)
        print_message $BLUE "🚀 Setting up Terraform for Smart Order Router..."
        echo ""
        
        print_message $YELLOW "Step 1: Initializing Terraform..."
        terraform init
        
        print_message $GREEN "✅ Terraform initialized!"
        echo ""
        
        print_message $YELLOW "Step 2: Creating workspaces..."
        
        # Create dev workspace
        terraform workspace new dev 2>/dev/null || {
            print_message $YELLOW "Workspace 'dev' already exists"
        }
        
        # Create prod workspace
        terraform workspace new prod 2>/dev/null || {
            print_message $YELLOW "Workspace 'prod' already exists"
        }
        
        # Switch back to default
        terraform workspace select default 2>/dev/null || true
        
        print_message $GREEN "✅ Workspaces created!"
        echo ""
        
        print_message $BLUE "📋 Next steps:"
        print_message $BLUE "1. Switch to a workspace: $0 switch dev"
        print_message $BLUE "2. Plan changes: terraform plan"
        print_message $BLUE "3. Apply changes: terraform apply"
        print_message $BLUE ""
        print_message $BLUE "Or import existing services: $0 import dev"
        ;;
        
    switch)
        if [ -z "${2:-}" ]; then
            print_message $RED "Error: Environment required (dev/prod)"
            show_usage
            exit 1
        fi
        
        check_terraform_init
        ENV=$2
        
        if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
            print_message $RED "Error: Environment must be 'dev' or 'prod'"
            exit 1
        fi
        
        print_message $BLUE "Switching to workspace: $ENV"
        terraform workspace select "$ENV"
        print_message $GREEN "✅ Now on workspace: $ENV"
        ;;
        
    list)
        check_terraform_init
        print_message $BLUE "Available workspaces:"
        terraform workspace list
        ;;
        
    current)
        check_terraform_init
        CURRENT=$(terraform workspace show)
        print_message $BLUE "Current workspace: $CURRENT"
        ;;
        
    import)
        if [ -z "${2:-}" ]; then
            print_message $RED "Error: Environment required (dev/prod)"
            show_usage
            exit 1
        fi
        
        check_terraform_init
        ENV=$2
        
        if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
            print_message $RED "Error: Environment must be 'dev' or 'prod'"
            exit 1
        fi
        
        # Switch to workspace
        terraform workspace select "$ENV"
        
        SERVICE_NAME="smart-order-router-$ENV"
        PROJECT_ID=$(grep '^project_id' terraform.tfvars | cut -d'=' -f2 | tr -d ' "')
        REGION=$(grep '^region' terraform.tfvars | cut -d'=' -f2 | tr -d ' "')
        
        print_message $YELLOW "Importing service: $SERVICE_NAME"
        print_message $BLUE "Project: $PROJECT_ID"
        print_message $BLUE "Region: $REGION"
        echo ""
        
        terraform import \
            'google_cloud_run_v2_service.smart_order_router' \
            "projects/$PROJECT_ID/locations/$REGION/services/$SERVICE_NAME"
        
        print_message $GREEN "✅ Import completed!"
        print_message $BLUE "Next: Run 'terraform plan' to see any configuration drift"
        ;;
        
    delete)
        if [ -z "${2:-}" ]; then
            print_message $RED "Error: Environment required (dev/prod)"
            show_usage
            exit 1
        fi
        
        check_terraform_init
        ENV=$2
        
        print_message $RED "⚠️  WARNING: This will delete workspace '$ENV' and its state!"
        read -p "Type 'YES' to confirm: " confirm
        
        if [[ $confirm == "YES" ]]; then
            terraform workspace select default
            terraform workspace delete "$ENV"
            print_message $GREEN "✅ Workspace '$ENV' deleted"
        else
            print_message $YELLOW "Operation cancelled"
        fi
        ;;
        
    *)
        show_usage
        ;;
esac

