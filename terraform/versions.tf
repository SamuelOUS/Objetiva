terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket       = "objetiva-tfstate-536697249598"
    key          = "objetiva/dev/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
  }
}