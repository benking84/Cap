resource "google_secret_manager_secret" "db_password_secret" {
  secret_id  = "db-password"
  replication {
    user_managed {
      replicas {
        location = "australia-southeast1"
      }
    }
  }
}

resource "google_secret_manager_secret" "db_user_secret" {
  secret_id  = "db-user"
  replication {
    user_managed {
      replicas {
        location = "australia-southeast1"
      }
    }
  }
}

resource "google_sql_database_instance" "main" {
<<<<<<< HEAD
  name             = "cap-sql-instance"
  database_version = "MYSQL_8_0"
  region           = var.region
=======
  depends_on = [
    var.private_service_access_id
  ]
  project             = var.project_id
  name                = "private-db-instance"
  database_version    = "POSTGRES_13"
  region              = var.region
>>>>>>> c0ca73b7 (fix(cloudbuild): enable apis and grant roles for new project)

  settings {
    tier = "db-f1-micro"

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
    }
  }

  deletion_protection = false
}

resource "google_sql_user" "default" {
  name     = var.db_user
  instance = google_sql_database_instance.main.name
  password = "changeme-password"
}

resource "google_sql_database" "main" {
  name     = "capdb"
  instance = google_sql_database_instance.main.name
}
