variable "project_id" {
  description = "The project ID to host the resources in."
  type        = string
}

variable "region" {
  description = "The region to host the resources in."
  type        = string
  default     = "us-central1"
}

variable "db_password_secret_id" {
  description = "Secret ID for the database password"
  type        = string
}

variable "db_user_secret_id" {
  description = "Secret ID for the database user"
  type        = string
}
