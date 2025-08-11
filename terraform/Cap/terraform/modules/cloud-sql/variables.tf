variable "project_id" {
  description = "The project ID to host the resources in."
  type        = string
}

variable "region" {
  description = "The region to host the resources in."
  type        = string
}

variable "network_id" {
  description = "The ID of the VPC network to connect the SQL instance to."
  type        = string
}

variable "db_user" {
  description = "The username for the database."
  type        = string
}

variable "db_password_secret_id" {
  description = "Secret ID for the database password"
  type        = string
}

variable "db_user_secret_id" {
  description = "Secret ID for the database user"
  type        = string
}

