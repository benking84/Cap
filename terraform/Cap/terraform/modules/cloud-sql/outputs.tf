output "db_instance_connection_name" {
  description = "The connection name of the database instance."
  value       = google_sql_database_instance.main.connection_name
}

output "db_name" {
  description = "The name of the database."
  value       = google_sql_database.main.name
}
