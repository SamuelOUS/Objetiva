output "api_url" {
  description = "URL base de la API."
  value       = module.aws_platform.api_url
}

output "api_public_ip" {
  description = "IP publica de la instancia que corre la API."
  value       = module.aws_platform.api_public_ip
}

output "ecr_repository_url" {
  description = "URL del repositorio ECR donde se sube la imagen."
  value       = module.aws_platform.ecr_repository_url
}

output "db_endpoint" {
  description = "Direccion del servidor PostgreSQL en RDS."
  value       = module.aws_platform.db_endpoint
}

output "instance_id" {
  description = "ID de la instancia EC2 (para entrar por SSM)."
  value       = module.aws_platform.instance_id
}