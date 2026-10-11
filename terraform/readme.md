# Infraestructura de Objetiva en AWS con Terraform

Despliega la API de Objetiva (Express + Prisma) en AWS usando Terraform: un repositorio de imágenes (ECR), una base de datos PostgreSQL (RDS) y un servidor (EC2) que corre la API en Docker, con sus roles y firewalls.

## Estructura

| Ruta | Contenido |
|---|---|
| `versions.tf` | Versiones de Terraform y del provider, y backend S3 del estado |
| `providers.tf` | Provider de AWS (región y etiquetas por defecto) |
| `variables.tf` | Variables del entorno |
| `main.tf` | Valores calculados (`locals`) y llamada al módulo |
| `outputs.tf` | Valores que se muestran al terminar (URL de la API, ECR, etc.) |
| `environments/dev.example.tfvars` | Plantilla de valores del entorno `dev` |
| `modules/aws-platform/` | Un archivo por servicio: `ecr.tf`, `network.tf`, `security.tf`, `iam.tf`, `rds.tf`, `ec2.tf`, más `variables.tf`, `versions.tf` y `outputs.tf` |

## Arquitectura

- **ECR:** guarda la imagen Docker de la API.
- **RDS PostgreSQL** (`db.t4g.micro`): base de datos, sin acceso público.
- **EC2** (`t3.micro`) con Docker: descarga la imagen de ECR y corre la API en el puerto 80.
- **Security Groups:** la API acepta HTTP desde internet; la base solo acepta tráfico de la API.
- **IAM:** rol de la EC2 con permiso de solo lectura sobre ECR y acceso por SSM.

## Requisitos

- Terraform 1.10 o superior, AWS CLI v2 y Docker.
- Una cuenta de AWS y un usuario IAM con clave de acceso (`aws configure`, región `us-east-1`).

## Preparación (una sola vez)

1. Crear el bucket S3 donde Terraform guarda el estado (el nombre debe coincidir con el de `versions.tf`):

```powershell
   $acct = aws sts get-caller-identity --query Account --output text
   aws s3api create-bucket --bucket "objetiva-tfstate-$acct" --region us-east-1
   aws s3api put-bucket-versioning --bucket "objetiva-tfstate-$acct" --versioning-configuration Status=Enabled
```

2. Crear el archivo de valores del entorno a partir de la plantilla y poner la contraseña de la base (solo letras y números, 16 caracteres o más). `dev.tfvars` está en `.gitignore` y no se sube a Git:

```powershell
   cd terraform
   Copy-Item environments\dev.example.tfvars environments\dev.tfvars
```

## Despliegue

Desde la carpeta `terraform`:

```powershell
terraform init
terraform plan "-var-file=environments/dev.tfvars"
terraform apply "-var-file=environments/dev.tfvars"
```

El `apply` crea la infraestructura (la base de datos tarda varios minutos). Al terminar muestra los outputs; para verlos otra vez: `terraform output`.

### Subir la imagen de la API

La EC2 espera la imagen en ECR y reintenta la descarga cada 20 segundos, así que puede subirse antes o después del `apply`. Desde la raíz del proyecto:

```powershell
$repo = terraform -chdir=terraform output -raw ecr_repository_url
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $repo.Split("/")[0]
docker build -t "${repo}:latest" .
docker push "${repo}:latest"
```

Al arrancar con `NODE_ENV=production`, el contenedor ejecuta `prisma migrate deploy` y deja la base migrada antes de iniciar la API.

### Verificar

```powershell
curl (terraform -chdir=terraform output -raw api_url)
```

## Eliminar la infraestructura

Al terminar la sustentación, desde la carpeta `terraform`:

```powershell
terraform destroy "-var-file=environments/dev.tfvars"
```

Elimina todo lo que creó Terraform (EC2, RDS, ECR con sus imágenes, Security Groups y roles). Está configurado para que no falle ni deje cobros: la base no tiene protección contra borrado ni snapshot final y el repositorio ECR se borra aunque tenga imágenes. El bucket S3 del estado no lo borra `destroy`, porque se creó aparte.

## Costos

Encendida, la infraestructura cuesta unos centavos de dólar por hora (la base de datos y la EC2). Destruirla al terminar evita cobros.