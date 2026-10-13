variable "project_name" {
  description = "Prefijo comun para los recursos."
  type        = string
  default     = "objetiva"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,20}$", var.project_name))
    error_message = "project_name debe tener entre 3 y 21 caracteres: minusculas, numeros o guiones."
  }
}

variable "environment" {
  description = "Nombre corto del ambiente."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "Region principal de AWS."
  type        = string
  default     = "us-east-1"
}

variable "db_password" {
  description = "Contrasena del usuario administrador de la base de datos."
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Etiquetas adicionales para los recursos."
  type        = map(string)
  default     = {}
}