output "bucket_id" {
  description = "O ID do bucket S3 criado"
  value       = aws_s3_bucket.app_assets.id
}

output "bucket_arn" {
  description = "O Amazon Resource Name do bucket S3"
  value       = aws_s3_bucket.app_assets.arn
}