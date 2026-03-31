variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "eu-central-1"
}

variable "project_name" {
  description = "Prefix for all resource names"
  type        = string
  default     = "shopify-mcp"
}

variable "lambda_runtime" {
  type    = string
  default = "nodejs24.x"
}

variable "lambda_timeout" {
  type    = number
  default = 30
}

variable "lambda_memory" {
  type    = number
  default = 256
}

variable "custom_domain" {
  description = "Optional custom domain name for the API (e.g. mcp.example.com). Leave empty to skip."
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate ARN for the custom domain. Required if custom_domain is set."
  type        = string
  default     = ""
}
