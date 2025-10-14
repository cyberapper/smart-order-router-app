# Project Configuration
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "asia-east1"
}

variable "environment" {
  description = "Environment name (dev/prod) - defaults to workspace name"
  type        = string
  default     = ""

  validation {
    condition     = var.environment == "" || contains(["dev", "prod"], var.environment)
    error_message = "Environment must be either 'dev' or 'prod', or empty to use workspace name."
  }
}

# Image Configuration
variable "image_registry" {
  description = "Docker image registry base path (e.g., asia-east1-docker.pkg.dev/project-id/repository/image-name)"
  type        = string
}

variable "image_tag_dev" {
  description = "Docker image tag or digest for development environment"
  type        = string
  default     = "latest"
}

variable "image_tag_prod" {
  description = "Docker image tag or digest for production environment (use SHA256 digest recommended)"
  type        = string
  default     = "latest"
}

# Service Account
variable "service_account_email" {
  description = "Service account email for Cloud Run service"
  type        = string
}

# Service Configuration
variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 8080
}

variable "cpu" {
  description = "CPU allocation for the service"
  type        = string
  default     = "1000m"
}

variable "memory" {
  description = "Memory allocation for the service"
  type        = string
  default     = "1Gi"
}

variable "timeout_seconds" {
  description = "Request timeout in seconds"
  type        = number
  default     = 300
}

variable "health_check_path" {
  description = "Path for health check endpoint"
  type        = string
  default     = "/api/health"
}

# Development Environment Configuration
variable "dev_min_instances" {
  description = "Minimum instances for development"
  type        = number
  default     = 0
}

variable "dev_max_instances" {
  description = "Maximum instances for development"
  type        = number
  default     = 5
}

variable "dev_ingress" {
  description = "Ingress setting for development environment"
  type        = string
  default     = "INGRESS_TRAFFIC_ALL"

  validation {
    condition     = contains(["INGRESS_TRAFFIC_ALL", "INGRESS_TRAFFIC_INTERNAL_ONLY", "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"], var.dev_ingress)
    error_message = "Ingress must be one of: INGRESS_TRAFFIC_ALL, INGRESS_TRAFFIC_INTERNAL_ONLY, INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER."
  }
}

variable "dev_allow_unauthenticated" {
  description = "Allow unauthenticated access in development"
  type        = bool
  default     = true
}

# Production Environment Configuration
variable "prod_min_instances" {
  description = "Minimum instances for production"
  type        = number
  default     = 1
}

variable "prod_max_instances" {
  description = "Maximum instances for production"
  type        = number
  default     = 20
}

variable "prod_ingress" {
  description = "Ingress setting for production environment"
  type        = string
  default     = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  validation {
    condition     = contains(["INGRESS_TRAFFIC_ALL", "INGRESS_TRAFFIC_INTERNAL_ONLY", "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"], var.prod_ingress)
    error_message = "Ingress must be one of: INGRESS_TRAFFIC_ALL, INGRESS_TRAFFIC_INTERNAL_ONLY, INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER."
  }
}

variable "prod_allow_unauthenticated" {
  description = "Allow unauthenticated access in production"
  type        = bool
  default     = false
}

variable "prod_authorized_members" {
  description = "List of members authorized to invoke the production service"
  type        = list(string)
  default     = []
}

# Execution Environment
variable "execution_environment" {
  description = "Execution environment generation"
  type        = string
  default     = "gen2"

  validation {
    condition     = contains(["gen1", "gen2"], var.execution_environment)
    error_message = "Execution environment must be either 'gen1' or 'gen2'."
  }
}
