provider "google" {
  project = var.project_id
  region  = var.region
}

# Local values for environment-specific configuration
locals {
  # Use workspace name as environment if not explicitly set
  environment = var.environment != "" ? var.environment : terraform.workspace

  # Service name based on environment
  service_name = local.environment == "prod" ? "smart-order-router-prod" : "smart-order-router-dev"

  # Image tag based on environment
  image_tag = local.environment == "prod" ? var.image_tag_prod : var.image_tag_dev

  # Determine image URL (support both version tags and SHA256 digests)
  image_url = length(regexall("^sha256:", local.image_tag)) > 0 ? "${var.image_registry}@${local.image_tag}" : "${var.image_registry}:${local.image_tag}"

  # Scaling configuration
  min_instances = local.environment == "prod" ? var.prod_min_instances : var.dev_min_instances
  max_instances = local.environment == "prod" ? var.prod_max_instances : var.dev_max_instances

  # Ingress configuration
  ingress = local.environment == "prod" ? var.prod_ingress : var.dev_ingress

  # Authentication configuration
  allow_unauthenticated = local.environment == "prod" ? var.prod_allow_unauthenticated : var.dev_allow_unauthenticated
  authorized_members    = local.environment == "prod" ? var.prod_authorized_members : []
}

# Cloud Run Service
resource "google_cloud_run_v2_service" "smart_order_router" {
  name     = local.service_name
  location = var.region

  template {
    scaling {
      min_instance_count = local.min_instances
      max_instance_count = local.max_instances
    }

    containers {
      image = local.image_url

      ports {
        container_port = var.container_port
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      # Environment variables
      env {
        name  = "NODE_ENV"
        value = local.environment == "prod" ? "production" : "development"
      }

      # Secret environment variables from Secret Manager
      env {
        name = "INFURA_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "SMART_ORDER_ROUTER_INFURA_API_KEY"
            version = "latest"
          }
        }
      }

      # Liveness probe
      liveness_probe {
        http_get {
          path = var.health_check_path
          port = var.container_port
        }
        initial_delay_seconds = 30
        timeout_seconds       = 5
        period_seconds        = 30
        failure_threshold     = 3
      }

      # Startup probe
      startup_probe {
        http_get {
          path = var.health_check_path
          port = var.container_port
        }
        initial_delay_seconds = 0
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 6
      }
    }

    timeout         = "${var.timeout_seconds}s"
    service_account = var.service_account_email

    annotations = {
      "run.googleapis.com/client-name"           = "terraform"
      "run.googleapis.com/execution-environment" = var.execution_environment
    }
  }

  # Ingress configuration
  ingress = local.ingress

  # Traffic configuration
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].annotations["run.googleapis.com/operation-id"],
      template[0].annotations["client.knative.dev/user-image"],
      template[0].annotations["run.googleapis.com/creator"],
      template[0].annotations["run.googleapis.com/lastModifier"],
    ]
  }
}

# IAM policy for public access (development)
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count = local.allow_unauthenticated ? 1 : 0

  name     = google_cloud_run_v2_service.smart_order_router.name
  location = google_cloud_run_v2_service.smart_order_router.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# IAM policy for authenticated access (production)
resource "google_cloud_run_v2_service_iam_member" "authenticated_invoker" {
  count = !local.allow_unauthenticated ? length(local.authorized_members) : 0

  name     = google_cloud_run_v2_service.smart_order_router.name
  location = google_cloud_run_v2_service.smart_order_router.location
  role     = "roles/run.invoker"
  member   = local.authorized_members[count.index]
}

# Outputs
output "environment" {
  description = "Current environment"
  value       = local.environment
}

output "service_name" {
  description = "Name of the Cloud Run service"
  value       = google_cloud_run_v2_service.smart_order_router.name
}

output "service_url" {
  description = "URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.smart_order_router.uri
}

output "service_location" {
  description = "Location of the Cloud Run service"
  value       = google_cloud_run_v2_service.smart_order_router.location
}

output "service_id" {
  description = "ID of the Cloud Run service"
  value       = google_cloud_run_v2_service.smart_order_router.id
}

output "ingress_setting" {
  description = "Current ingress setting"
  value       = local.ingress
}
