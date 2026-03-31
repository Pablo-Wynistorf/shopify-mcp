# Shopify MCP Server — AWS Lambda

A serverless MCP server for Shopify, deployed on AWS Lambda with REST API Gateway, API key authentication, and DynamoDB token caching.

## Authentication (two layers)

### Layer 1: API Gateway API Key
Every request must include an `x-api-key` header. API Gateway validates this before the request even reaches Lambda. Requests without a valid key get a `403 Forbidden` from the gateway itself.

### Layer 2: Shopify Client Credentials
The JSON body must include `credentials` with your Shopify `clientId`, `clientSecret`, and `shopDomain`. These are used to obtain a Shopify access token via the client_credentials OAuth flow. The token is cached in DynamoDB with TTL (DynamoDB encrypts at rest by default).

## Request format

```bash
# List available tools
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/mcp/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "credentials": { "clientId": "...", "clientSecret": "...", "shopDomain": "your-store.myshopify.com" }
  }'

# Call a tool
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/mcp/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": { "name": "get-products", "arguments": { "limit": 5 } },
    "credentials": { "clientId": "...", "clientSecret": "...", "shopDomain": "your-store.myshopify.com" }
  }'

# With custom domain (if configured):
# POST https://your-custom-domain.com/mcp
```

## MCP Client Configuration

Copy `mcp.json.example` and fill in your values:

```json
{
  "mcpServers": {
    "shopify-mcp": {
      "type": "streamable-http",
      "url": "https://your-api-id.execute-api.eu-central-1.amazonaws.com/mcp/mcp",
      "headers": {
        "x-api-key": "your-api-gateway-key",
        "Content-Type": "application/json"
      },
      "body": {
        "credentials": {
          "clientId": "your-shopify-client-id",
          "clientSecret": "your-shopify-client-secret",
          "shopDomain": "your-store.myshopify.com"
        }
      }
    }
  }
}
```

If using a custom domain, replace the URL with `https://your-custom-domain.com/mcp`.

## Deploy

```bash
cd lambda-mcp
npm install

cd terraform
terraform init
terraform apply

# With custom domain:
terraform apply \
  -var='custom_domain=mcp.example.com' \
  -var='certificate_arn=arn:aws:acm:eu-central-1:123456789:certificate/abc-123'
```

After applying with a custom domain, create a CNAME DNS record pointing your domain to the `custom_domain_target` output value.

Get your API key value:
```bash
terraform output -raw api_key_value
```

## Infrastructure

- **REST API Gateway** — API key required on POST /mcp, with usage plan (rate limit: 20 req/s, burst: 50, daily quota: 10k)
- **Lambda** — Node.js 20.x, handles MCP JSON-RPC requests
- **DynamoDB** — PAY_PER_REQUEST, stores hashed-credential → access token with TTL (encrypted at rest by default)
- **KMS** — Not used; DynamoDB's built-in encryption at rest is sufficient

## Security

- API key validated at the gateway level (never reaches Lambda without it)
- Shopify credentials are SHA-256 hashed for DynamoDB key lookups — raw secrets never stored
- DynamoDB encrypted at rest by default (AWS-owned keys)
- shopDomain is validated against `*.myshopify.com` pattern
- Rate limiting and daily quotas via API Gateway usage plan
- Least-privilege IAM (only GetItem/PutItem on DynamoDB)
