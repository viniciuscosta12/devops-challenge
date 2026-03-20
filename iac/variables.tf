variable "aws_region" {
  description = "Região da AWS onde os recursos serão provisionados"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Nome do bucket S3"
  type        = string
}

variable "common_tags" {
  description = "Tags comuns aplicadas a todos os recursos para governança"
  type        = map(string)
  default = {
    Project     = "devops-challenge"
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}