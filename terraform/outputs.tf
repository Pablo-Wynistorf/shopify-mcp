output "api_endpoint" {
  description = "The URL of the MCP API endpoint (default API Gateway URL)"
  value       = "${aws_api_gateway_stage.mcp.invoke_url}/mcp"
}

output "custom_domain_endpoint" {
  description = "The custom domain endpoint (if configured)"
  value       = var.custom_domain != "" ? "https://${var.custom_domain}/mcp" : "Not configured — set custom_domain and certificate_arn variables"
}

output "custom_domain_target" {
  description = "CNAME target for your DNS record (if custom domain is configured)"
  value       = var.custom_domain != "" ? aws_api_gateway_domain_name.custom[0].regional_domain_name : "N/A"
}

output "api_key_id" {
  description = "The API key ID (use AWS CLI to get the value: aws apigateway get-api-key --api-key <id> --include-value)"
  value       = aws_api_gateway_api_key.mcp.id
}

output "api_key_value" {
  description = "The API key value for authenticating requests"
  value       = aws_api_gateway_api_key.mcp.value
  sensitive   = true
}

output "lambda_function_name" {
  value = aws_lambda_function.mcp.function_name
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.tokens.name
}
