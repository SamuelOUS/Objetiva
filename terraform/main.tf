locals {
  name = "${var.project_name}-${var.environment}"

  tags = merge(var.tags, {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  })
}

module "aws_platform" {
  source = "./modules/aws-platform"

  name        = local.name
  db_password = var.db_password
}