output "network_id" {
  description = "The ID of the VPC network."
  value       = google_compute_network.main.id
}

output "vpc_connector_id" {
    description = "The ID of the VPC connector"
    value = google_vpc_access_connector.main.id
}

output "private_service_access_id" {
  description = "The ID of the private service access connection."
  value       = google_service_networking_connection.private_service_access.id
}
