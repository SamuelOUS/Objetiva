output "api_public_ip" {
  description = "IP publica de la instancia que corre la API."
  value       = aws_instance.api.public_ip
}

output "api_url" {
  description = "URL base de la API."
  value       = "http://${aws_instance.api.public_ip}"
}

output "ecr_repository_url" {
  description = "URL del repositorio ECR donde se sube la imagen."
  value       = aws_ecr_repository.api.repository_url
}

output "db_endpoint" {
  description = "Direccion del servidor PostgreSQL en RDS."
  value       = aws_db_instance.postgres.address
}

output "instance_id" {
  description = "ID de la instancia EC2 (para entrar por SSM)."
  value       = aws_instance.api.id
}