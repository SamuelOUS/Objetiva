data "aws_region" "current" {}

data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

locals {
  registry     = split("/", aws_ecr_repository.api.repository_url)[0]
  image        = "${aws_ecr_repository.api.repository_url}:latest"
  database_url = "postgresql://${aws_db_instance.postgres.username}:${var.db_password}@${aws_db_instance.postgres.address}:5432/${aws_db_instance.postgres.db_name}?schema=public"
}

resource "aws_instance" "api" {
  ami                         = data.aws_ssm_parameter.al2023.value
  instance_type               = "t3.micro"
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.api.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2.name
  associate_public_ip_address = true
  user_data_replace_on_change = true

  metadata_options {
    http_tokens = "required"
  }

  root_block_device {
    volume_size = 12
    volume_type = "gp3"
  }

  user_data = <<-EOF
    #!/bin/bash
    dnf install -y docker
    systemctl enable --now docker
    until aws ecr get-login-password --region ${data.aws_region.current.name} | docker login --username AWS --password-stdin ${local.registry} && docker pull ${local.image}; do
      sleep 20
    done
    docker run -d --name objetiva --restart unless-stopped -p 80:3000 \
      -e NODE_ENV=production \
      -e DATABASE_URL='${local.database_url}' \
      ${local.image}
  EOF

  tags = {
    Name = "${var.name}-api"
  }

  lifecycle {
    ignore_changes = [ami]
  }
}