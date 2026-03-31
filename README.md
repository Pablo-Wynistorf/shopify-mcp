# Shopify MCP Server — AWS Lambda

A serverless [Model Context Protocol](https://modelcontextprotocol.io/) server for Shopify, deployed on AWS Lambda with REST API Gateway, API key authentication, and DynamoDB token caching. Uses the Shopify Admin GraphQL API (version `2026-01`) via client credentials OAuth.

## Features

- 44 tools covering products, orders, customers, inventory, collections, metafields, fulfillment, pricing, and more
- Two-layer authentication (API Gateway key + Shopify client credentials)
- Token caching in DynamoDB with automatic TTL expiry
- Optional custom domain support
- CORS enabled for browser-based clients
- Rate limiting and daily quotas via API Gateway usage plan

## Authentication

### Layer 1: API Gateway API Key
Every request must include an `x-api-key` header. API Gateway validates this before the request reaches Lambda. Requests without a valid key get a `403 Forbidden` from the gateway itself.

### Layer 2: Shopify Client Credentials
The JSON body must include `credentials` with your Shopify `clientId`, `clientSecret`, and `shopDomain`. These are used to obtain a Shopify access token via the `client_credentials` OAuth flow. Tokens are cached in DynamoDB with TTL (5-minute safety margin before expiry). Credentials are SHA-256 hashed for DynamoDB key lookups — raw secrets are never stored.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.x
- [Terraform](https://www.terraform.io/) >= 1.5
- AWS CLI configured with appropriate credentials
- A [Shopify custom app](https://shopify.dev/docs/apps/build/authentication/client-credentials) with client credentials grant enabled

## Deploy

```bash
# Install dependencies
npm install

# Initialize and deploy infrastructure
cd terraform
terraform init
terraform apply
```

To use a custom domain:

```bash
terraform apply \
  -var='custom_domain=mcp.example.com' \
  -var='certificate_arn=arn:aws:acm:eu-central-1:123456789:certificate/abc-123'
```

After applying with a custom domain, create a CNAME DNS record pointing your domain to the `custom_domain_target` output value.

### Retrieve your API key

The API key value is marked as sensitive in Terraform outputs. To view it:

```bash
terraform output api_key_value
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

## Request Format

```bash
# List available tools
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/mcp/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "credentials": {
      "clientId": "...",
      "clientSecret": "...",
      "shopDomain": "your-store.myshopify.com"
    }
  }'

# Call a tool
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/mcp/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get-products",
      "arguments": { "limit": 5 }
    },
    "credentials": {
      "clientId": "...",
      "clientSecret": "...",
      "shopDomain": "your-store.myshopify.com"
    }
  }'
```

## Available Tools (44)

Tools are auto-loaded from the `tools/` directory at startup.

### Shop

| Tool | Description |
|------|-------------|
| `get-shop-info` | Get shop configuration including name, plan, currencies, features, payment settings, tax config, and contact info |
| `get-locations` | Get all inventory/fulfillment locations with addresses, capabilities, and active status |
| `get-markets` | Get all markets with their regions, currencies, status, and web presence configuration |

### Products

| Tool | Description |
|------|-------------|
| `get-products` | Get all products or search by title |
| `get-product-by-id` | Get a specific product by ID |
| `get-product-variants-detailed` | Get all variant fields for a product: pricing, inventory, barcode, weight, tax code, selected options, metafields, and image |
| `create-product` | Create a new product (use `manage-product-variants` afterward to create all real variants with prices) |
| `update-product` | Update an existing product's fields (title, description, status, tags, etc.) |
| `delete-product` | Delete a product |
| `manage-product-options` | Create, update, or delete product options (e.g. Size, Color) |
| `manage-product-variants` | Create or update product variants (omit variant id to create new, include id to update existing) |
| `delete-product-variants` | Delete one or more variants from a product |

### Orders

| Tool | Description |
|------|-------------|
| `get-orders` | Get orders with optional filtering by status |
| `get-order-by-id` | Get a specific order by ID |
| `get-order-transactions` | Get all payment transactions for an order including authorizations, captures, refunds, and voids |
| `get-order-refund-details` | Get detailed refund info for an order including refunded items, amounts, restock status, and associated transactions |
| `update-order` | Update an existing order with new information |
| `order-cancel` | Cancel an order with options for refunding, restocking inventory, and customer notification |
| `order-close-open` | Close or reopen an order |
| `order-mark-as-paid` | Mark an order as paid (useful for manual/offline payments) |
| `create-draft-order` | Create a draft order for phone/chat sales, invoicing, or wholesale |
| `complete-draft-order` | Complete a draft order, converting it into a real order |
| `refund-create` | Create a full or partial refund for an order with optional restocking and shipping refund |

### Customers

| Tool | Description |
|------|-------------|
| `get-customers` | Get customers or search by name/email |
| `get-customer-by-id` | Get a single customer by ID |
| `get-customer-orders` | Get orders for a specific customer |
| `create-customer` | Create a new customer |
| `update-customer` | Update a customer's information |
| `delete-customer` | Delete a customer |
| `manage-customer-address` | Create, update, or delete a customer's mailing address (can set as default) |
| `customer-merge` | Merge two customer records into one (optionally override which fields to keep) |

### Fulfillment

| Tool | Description |
|------|-------------|
| `create-fulfillment` | Create a fulfillment (mark items as shipped) with optional tracking info and customer notification |

### Inventory

| Tool | Description |
|------|-------------|
| `get-inventory-items` | Get inventory item details for all variants of a product including SKU, cost, tracked status, country of origin, and HS codes |
| `get-inventory-levels` | Get inventory quantities per location for an inventory item (available, on_hand, committed, reserved, incoming, damaged, etc.) |
| `inventory-set-quantities` | Set absolute inventory quantities for items at specific locations |

### Collections

| Tool | Description |
|------|-------------|
| `get-collections` | Query collections (manual & smart) with optional filtering |
| `get-collection-by-id` | Get a single collection with full details including products, rules for smart collections, SEO, and image |

### Metafields

| Tool | Description |
|------|-------------|
| `get-metafield-definitions` | Discover custom metafield definitions for any resource type (PRODUCT, ORDER, CUSTOMER, etc.) |
| `get-metafields` | Get metafields for any Shopify resource (products, orders, customers, variants, collections, etc.) |
| `set-metafields` | Set metafields on any Shopify resource (creates or updates up to 25 metafields atomically) |
| `delete-metafields` | Delete metafields from any Shopify resource by specifying owner ID, namespace, and key |

### Pricing

| Tool | Description |
|------|-------------|
| `get-price-lists` | Get all price lists with their currency, fixed/relative adjustments, and associated catalog context |

### Tags

| Tool | Description |
|------|-------------|
| `manage-tags` | Add or remove tags on any taggable resource (orders, products, customers, draft orders, articles) |

## Infrastructure

| Resource | Details |
|----------|---------|
| API Gateway | REST API, API key required on `POST /mcp`, CORS preflight on `OPTIONS /mcp` |
| Usage Plan | Rate limit: 20 req/s, burst: 50, daily quota: 10,000 |
| Lambda | Node.js 20.x, 256 MB memory, 30s timeout |
| DynamoDB | PAY_PER_REQUEST, stores hashed credentials → access tokens with TTL |
| Custom Domain | Optional, regional endpoint with ACM certificate |

## Project Structure

```
├── index.js                  # Lambda handler — MCP JSON-RPC router
├── lib/
│   ├─