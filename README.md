# Shopify MCP Server — AWS Lambda

A serverless [Model Context Protocol](https://modelcontextprotocol.io/) server for Shopify, deployed on AWS Lambda with REST API Gateway, API key authentication, and DynamoDB token caching. Uses the Shopify Admin GraphQL API (version `2026-01`) via client credentials OAuth.

## Features

- 44 tools covering products, orders, customers, inventory, collections, metafields, fulfillment, pricing, and more
- Two-layer authentication (API Gateway key + Shopify client credentials)
- Token caching in DynamoDB with automatic TTL expiry
- Optional custom domain support
- CORS enabled for browser-based clients
- Rate limiting and daily quotas via API Gateway usage plan

---

## Shopify App Setup

### 1. Create the App in the Shopify Partners Dashboard

1. Go to [partners.shopify.com](https://partners.shopify.com) and log in (or create a free Partners account).
2. In the left sidebar, click **Apps** → **Create app**.
3. Choose **Create app manually**.
4. Enter a name (e.g. `Shopify MCP Server`) and click **Create**.

### 2. Get Client ID and Client Secret

1. After creating the app, you'll land on the **App overview** page.
2. In the left sidebar, click **Client credentials**.
3. Copy the **Client ID** and **Client secret** — you'll need both for the MCP configuration.

### 3. Configure Access Scopes

This MCP server uses the **client credentials** OAuth flow (headless, no user interaction). You need to configure the scopes your app requests.

1. In your app settings, go to **Configuration**.
2. Under **Access scopes**, click **Configure** next to "Admin API integration".
3. Add the following scopes:

| Scope | Reason |
|-------|--------|
| `read_products` | List and read products, variants, options |
| `write_products` | Create, update, delete products and variants |
| `read_orders` | List and read orders, transactions, refunds |
| `write_orders` | Update orders, cancel, close/reopen, mark as paid |
| `read_customers` | List and read customers |
| `write_customers` | Create, update, delete, merge customers |
| `read_inventory` | Read inventory items and levels |
| `write_inventory` | Set inventory quantities |
| `read_fulfillments` | Read fulfillment orders |
| `write_fulfillments` | Create fulfillments |
| `read_draft_orders` | Read draft orders |
| `write_draft_orders` | Create and complete draft orders |
| `read_locales` | Read shop locales |
| `read_shipping` | Read shipping/locations info |
| `read_price_rules` | Read price lists |
| `read_publications` | Read collections and publications |
| `read_markets` | Read markets configuration |

4. Click **Save**.

### 4. Apply for Protected Customer Data Access (if needed)

Some scopes involve sensitive customer data (names, emails, addresses, phone numbers). Shopify requires apps to apply for access to protected customer data.

1. In your app settings, go to **API access** → **Protected customer data access**.
2. Click **Request access**.
3. You'll need to provide:
   - A reason for accessing the data (e.g. "Server-side order management and customer support via MCP protocol").
   - Which specific data fields you need: **Name**, **Email**, **Phone**, **Address**.
   - How you store and protect the data.
   - Your privacy policy URL.
4. Submit the request. Shopify typically reviews within a few business days.
5. Until approved, API calls that return protected customer fields will have those fields redacted.

> **Note:** If you only use the product/inventory/collection tools and don't need customer PII, you can skip this step.

### 5. Enable the Client Credentials Grant

The client credentials flow must be explicitly enabled for your app:

1. In your app settings, go to **Configuration**.
2. Under **Access scopes**, make sure "Client credentials" is selected as the grant type under the Admin API integration.
3. This allows the app to authenticate without a merchant going through an OAuth redirect.

### 6. Install the App on Your Store

1. In the Partners Dashboard, go to your app → **Test your app**.
2. Select the store you want to install on (must be a development store or a store where you have staff access).
3. Click **Install app** and approve the requested scopes.
4. Alternatively, you can generate an install link:
   ```
   https://{your-store}.myshopify.com/admin/oauth/install?client_id={YOUR_CLIENT_ID}
   ```
   Open this URL while logged into the store admin and approve the installation.

After installation, the client credentials flow will work for that store.

---

## Authentication

### Layer 1: API Gateway API Key
Every request must include an `x-api-key` header. API Gateway validates this before the request reaches Lambda. Requests without a valid key get a `403 Forbidden` from the gateway itself.

### Layer 2: Shopify Client Credentials
Every request must include the following headers with your Shopify credentials:

| Header | Description |
|--------|-------------|
| `x-shopify-client-id` | Your Shopify app client ID |
| `x-shopify-client-secret` | Your Shopify app client secret |
| `x-shopify-shop-domain` | Your store domain (e.g. `your-store.myshopify.com`) |

These are used to obtain a Shopify access token via the `client_credentials` OAuth flow. Tokens are cached in DynamoDB with TTL (5-minute safety margin before expiry). Credentials are SHA-256 hashed for DynamoDB key lookups — raw secrets are never stored.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.x
- [Terraform](https://www.terraform.io/) >= 1.5
- AWS CLI configured with appropriate credentials
- A Shopify Partners account with a custom app (see [Shopify App Setup](#shopify-app-setup) above)

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

---

## MCP Client Configuration

### Kiro


Copy `mcp.json.example` to `.kiro/settings/mcp.json` (workspace-level) or `~/.kiro/settings/mcp.json` (user-level) and fill in your values:

```json
{
  "mcpServers": {
    "shopify-mcp": {
      "type": "streamable-http",
      "url": "https://your-api-id.execute-api.eu-central-1.amazonaws.com/mcp/mcp",
      "headers": {
        "x-api-key": "your-api-gateway-key",
        "x-shopify-client-id": "your-shopify-client-id",
        "x-shopify-client-secret": "your-shopify-client-secret",
        "x-shopify-shop-domain": "your-store.myshopify.com",
        "Content-Type": "application/json"
      }
    }
  }
}
```

Replace:
- `your-api-id.execute-api.eu-central-1.amazonaws.com` with your actual API Gateway endpoint (from `terraform output api_endpoint`)
- `your-api-gateway-key` with the key from `terraform output api_key_value`
- `your-shopify-client-id` and `your-shopify-client-secret` with the values from your Shopify app (see [step 2](#2-get-client-id-and-client-secret))
- `your-store.myshopify.com` with your store's myshopify.com domain

If using a custom domain, replace the URL with `https://your-custom-domain.com/mcp`.

### Other MCP Clients

Any MCP client that supports the `streamable-http` transport can connect. The server expects:
- `POST` requests with `Accept: text/event-stream` header for SSE responses
- Shopify credentials and API key passed as HTTP headers
- Standard JSON-RPC 2.0 message format

---

## Request Format

```bash
# List available tools
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/mcp/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-shopify-client-id: YOUR_CLIENT_ID" \
  -H "x-shopify-client-secret: YOUR_CLIENT_SECRET" \
  -H "x-shopify-shop-domain: your-store.myshopify.com" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# Call a tool
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/mcp/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-shopify-client-id: YOUR_CLIENT_ID" \
  -H "x-shopify-client-secret: YOUR_CLIENT_SECRET" \
  -H "x-shopify-shop-domain: your-store.myshopify.com" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get-products",
      "arguments": { "limit": 5 }
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
| `get-fulfillment-orders` | Get fulfillment orders for a given order, including status, assigned location, and line items |

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
│   ├── crypto.js             # SHA-256 credential hashing
│   ├── helpers.js            # GraphQL response helpers
│   ├── shopifyAuth.js        # Client credentials OAuth flow + caching
│   ├── shopifyClient.js      # GraphQL client factory (API version 2026-01)
│   └── tokenStore.js         # DynamoDB get/put for cached tokens
├── tools/
│   ├── registry.js           # Auto-loads all tool modules
│   └── *.js                  # Individual tool implementations
├── terraform/
│   ├── main.tf               # Lambda, API Gateway, DynamoDB, IAM, custom domain
│   ├── variables.tf          # Configurable inputs (region, domain, memory, etc.)
│   └── outputs.tf            # Endpoint URLs, API key, resource names
├── mcp.json.example          # MCP client config template
└── package.json
```

## Security

- API key validated at the gateway level (never reaches Lambda without it)
- Shopify credentials are SHA-256 hashed for DynamoDB key lookups — raw secrets never stored
- DynamoDB encrypted at rest by default (AWS-owned keys)
- `shopDomain` validated against `*.myshopify.com` pattern
- Rate limiting and daily quotas via API Gateway usage plan
- Least-privilege IAM (Lambda only has `GetItem`/`PutItem` on the tokens table)
- Token cache includes 5-minute safety margin before expiry

## Terraform Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `aws_region` | `eu-central-1` | AWS region to deploy into |
| `project_name` | `shopify-mcp` | Prefix for all resource names |
| `lambda_runtime` | `nodejs20.x` | Lambda runtime |
| `lambda_timeout` | `30` | Lambda timeout in seconds |
| `lambda_memory` | `256` | Lambda memory in MB |
| `custom_domain` | `""` | Optional custom domain (e.g. `mcp.example.com`) |
| `certificate_arn` | `""` | ACM certificate ARN (required if `custom_domain` is set) |

## Terraform Outputs

| Output | Description |
|--------|-------------|
| `api_endpoint` | Default API Gateway endpoint URL |
| `custom_domain_endpoint` | Custom domain endpoint (if configured) |
| `custom_domain_target` | CNAME target for DNS record (if configured) |
| `api_key_id` | API key ID |
| `api_key_value` | API key value (sensitive — use `terraform output api_key_value` to view) |
| `lambda_function_name` | Lambda function name |
| `dynamodb_table_name` | DynamoDB table name |
