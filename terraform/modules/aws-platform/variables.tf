variable "name" {
  description = "Prefijo comun para los nombres de los recursos."
  type        = string
}

variable "db_password" {
  description = "Contrasena del usuario administrador de la base de datos."
  type        = string
  sensitive   = true
}