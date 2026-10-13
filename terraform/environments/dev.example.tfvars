project_name = "objetiva"
environment  = "dev"
aws_region   = "us-east-1"

# Copie este archivo como dev.tfvars y reemplace la contrasena.
# dev.tfvars NO se sube a Git. Use solo letras y numeros (16 o mas).
db_password = "REEMPLAZAR_CON_UN_SECRETO_SEGURO"

tags = {
  course = "enfasis-devops"
  owner  = "estudiante"
}