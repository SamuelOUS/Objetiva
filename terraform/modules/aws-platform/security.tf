resource "aws_security_group" "api" {
  name        = "${var.name}-api-sg"
  description = "Trafico HTTP hacia la API"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP desde internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Salida a internet para ECR y actualizaciones"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db" {
  name        = "${var.name}-db-sg"
  description = "PostgreSQL solo desde la API"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "PostgreSQL desde el grupo de seguridad de la API"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }
}