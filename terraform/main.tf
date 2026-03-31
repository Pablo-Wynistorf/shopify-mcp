terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ─── DynamoDB table for token caching ──────────────────────────────────

resource "aws_dynamodb_table" "tokens" {
  name         = "${var.project_name}-tokens"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = {
    Project = var.project_name
  }
}

# ─── IAM role for Lambda ──────────────────────────────────────────────

resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${var.project_name}-dynamodb"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
      ]
      Resource = aws_dynamodb_table.tokens.arn
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}


# ─── Lambda function ──────────────────────────────────────────────────

resource "terraform_data" "lambda_build" {
  triggers_replace = [timestamp()]

  provisioner "local-exec" {
    working_dir = "${path.module}/.."
    command     = "npm ci --omit=dev"
  }
}

resource "terraform_data" "lambda_zip" {
  triggers_replace = [timestamp()]

  depends_on = [terraform_data.lambda_build]

  provisioner "local-exec" {
    working_dir = "${path.module}/.."
    command     = "zip -r terraform/function.zip index.js lib/ tools/ node_modules/ -x 'terraform/*' '.git/*'"
  }
}

data "local_file" "lambda_zip" {
  filename   = "${path.module}/function.zip"
  depends_on = [terraform_data.lambda_zip]
}

resource "aws_lambda_function" "mcp" {
  function_name    = "${var.project_name}-server"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = var.lambda_runtime
  timeout          = var.lambda_timeout
  memory_size      = var.lambda_memory
  filename         = "${path.module}/function.zip"
  source_code_hash = data.local_file.lambda_zip.content_base64sha256

  environment {
    variables = {
      TOKEN_TABLE = aws_dynamodb_table.tokens.name
    }
  }
}

# ─── API Gateway (REST API with API Key auth) ─────────────────────────

resource "aws_api_gateway_rest_api" "mcp" {
  name        = "${var.project_name}-api"
  description = "Shopify MCP Server REST API with API key authentication"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "mcp" {
  rest_api_id = aws_api_gateway_rest_api.mcp.id
  parent_id   = aws_api_gateway_rest_api.mcp.root_resource_id
  path_part   = "mcp"
}

# POST /mcp — requires API key
resource "aws_api_gateway_method" "post" {
  rest_api_id      = aws_api_gateway_rest_api.mcp.id
  resource_id      = aws_api_gateway_resource.mcp.id
  http_method      = "POST"
  authorization    = "NONE"
  api_key_required = true
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id             = aws_api_gateway_rest_api.mcp.id
  resource_id             = aws_api_gateway_resource.mcp.id
  http_method             = aws_api_gateway_method.post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.mcp.invoke_arn
}

# GET /mcp — SSE stream attempt (Lambda returns 405)
resource "aws_api_gateway_method" "get" {
  rest_api_id      = aws_api_gateway_rest_api.mcp.id
  resource_id      = aws_api_gateway_resource.mcp.id
  http_method      = "GET"
  authorization    = "NONE"
  api_key_required = true
}

resource "aws_api_gateway_integration" "get_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.mcp.id
  resource_id             = aws_api_gateway_resource.mcp.id
  http_method             = aws_api_gateway_method.get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.mcp.invoke_arn
}

# DELETE /mcp — session termination
resource "aws_api_gateway_method" "delete" {
  rest_api_id      = aws_api_gateway_rest_api.mcp.id
  resource_id      = aws_api_gateway_resource.mcp.id
  http_method      = "DELETE"
  authorization    = "NONE"
  api_key_required = true
}

resource "aws_api_gateway_integration" "delete_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.mcp.id
  resource_id             = aws_api_gateway_resource.mcp.id
  http_method             = aws_api_gateway_method.delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.mcp.invoke_arn
}

# OPTIONS /mcp — CORS preflight (no API key required)
resource "aws_api_gateway_method" "options" {
  rest_api_id      = aws_api_gateway_rest_api.mcp.id
  resource_id      = aws_api_gateway_resource.mcp.id
  http_method      = "OPTIONS"
  authorization    = "NONE"
  api_key_required = false
}

resource "aws_api_gateway_integration" "options" {
  rest_api_id = aws_api_gateway_rest_api.mcp.id
  resource_id = aws_api_gateway_resource.mcp.id
  http_method = aws_api_gateway_method.options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_200" {
  rest_api_id = aws_api_gateway_rest_api.mcp.id
  resource_id = aws_api_gateway_resource.mcp.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options" {
  rest_api_id = aws_api_gateway_rest_api.mcp.id
  resource_id = aws_api_gateway_resource.mcp.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = aws_api_gateway_method_response.options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,x-api-key,mcp-session-id,Accept'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,GET,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Deploy
resource "aws_api_gateway_deployment" "mcp" {
  rest_api_id = aws_api_gateway_rest_api.mcp.id

  depends_on = [
    aws_api_gateway_integration.lambda,
    aws_api_gateway_integration.get_lambda,
    aws_api_gateway_integration.delete_lambda,
    aws_api_gateway_integration.options,
  ]

  # Force redeployment when config changes
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.mcp.id,
      aws_api_gateway_method.post.id,
      aws_api_gateway_method.get.id,
      aws_api_gateway_method.delete.id,
      aws_api_gateway_integration.lambda.id,
      aws_api_gateway_integration.get_lambda.id,
      aws_api_gateway_integration.delete_lambda.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "mcp" {
  rest_api_id   = aws_api_gateway_rest_api.mcp.id
  deployment_id = aws_api_gateway_deployment.mcp.id
  stage_name    = "mcp"
}

# ─── API Key + Usage Plan ─────────────────────────────────────────────

resource "aws_api_gateway_api_key" "mcp" {
  name    = "${var.project_name}-key"
  enabled = true
}

resource "aws_api_gateway_usage_plan" "mcp" {
  name = "${var.project_name}-usage-plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.mcp.id
    stage  = aws_api_gateway_stage.mcp.stage_name
  }

  throttle_settings {
    burst_limit = 50
    rate_limit  = 20
  }

  quota_settings {
    limit  = 10000
    period = "DAY"
  }
}

resource "aws_api_gateway_usage_plan_key" "mcp" {
  key_id        = aws_api_gateway_api_key.mcp.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.mcp.id
}

# Lambda permission for REST API
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.mcp.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.mcp.execution_arn}/*/*"
}

# ─── Optional Custom Domain ───────────────────────────────────────────

resource "aws_api_gateway_domain_name" "custom" {
  count       = var.custom_domain != "" ? 1 : 0
  domain_name = var.custom_domain

  regional_certificate_arn = var.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_base_path_mapping" "custom" {
  count       = var.custom_domain != "" ? 1 : 0
  api_id      = aws_api_gateway_rest_api.mcp.id
  stage_name  = aws_api_gateway_stage.mcp.stage_name
  domain_name = aws_api_gateway_domain_name.custom[0].domain_name

  # Map root of custom domain directly to the stage,
  # so the URL becomes: https://custom-domain/mcp
}
