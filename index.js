const { getAccessToken } = require("./lib/shopifyAuth");
const { createShopifyClient } = require("./lib/shopifyClient");
const { tools } = require("./tools/registry");

/**
 * AWS Lambda handler for the Shopify MCP server.
 *
 * Authentication: Two layers
 * 1. API Gateway validates the x-api-key header (403 if missing/invalid)
 * 2. Shopify credentials in the body are used to fetch/cache access tokens
 *
 * Expects:
 * - Header: x-api-key: <your-api-gateway-key>
 * - JSON body:
 * {
 *   "jsonrpc": "2.0",
 *   "id": 1,
 *   "method": "tools/call" | "tools/list",
 *   "params": { "name": "get-products", "arguments": { ... } },
 *   "credentials": {
 *     "clientId": "...",
 *     "clientSecret": "...",
 *     "shopDomain": "my-store.myshopify.com"
 *   }
 * }
 */
exports.handler = async (event) => {
  try {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body || event;

    const { id, method, params, credentials } = body;

    // ── Validate credentials ────────────────────────────────────────
    if (!credentials || !credentials.clientId || !credentials.clientSecret || !credentials.shopDomain) {
      return respond(400, {
        jsonrpc: "2.0",
        id: id || null,
        error: {
          code: -32600,
          message: "Missing credentials. Provide clientId, clientSecret, and shopDomain.",
        },
      });
    }

    const { clientId, clientSecret, shopDomain } = credentials;

    // ── Validate shopDomain format ──────────────────────────────────
    if (!/^[a-z0-9-]+\.myshopify\.com$/i.test(shopDomain)) {
      return respond(400, {
        jsonrpc: "2.0",
        id: id || null,
        error: { code: -32600, message: "Invalid shopDomain. Must be a valid *.myshopify.com domain." },
      });
    }

    // ── Route by method ─────────────────────────────────────────────
    if (method === "tools/list") {
      const toolList = Object.entries(tools).map(([name, t]) => ({
        name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));
      return respond(200, { jsonrpc: "2.0", id, result: { tools: toolList } });
    }

    if (method === "tools/call") {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (!toolName || !tools[toolName]) {
        return respond(404, {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown tool: ${toolName}` },
        });
      }

      // Get (or fetch + cache) the Shopify access token
      const accessToken = await getAccessToken(clientId, clientSecret, shopDomain);
      const client = createShopifyClient(shopDomain, accessToken);

      const result = await tools[toolName].execute(client, toolArgs);

      return respond(200, {
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(result) }] },
      });
    }

    // ── Unknown method ──────────────────────────────────────────────
    return respond(400, {
      jsonrpc: "2.0",
      id: id || null,
      error: { code: -32601, message: `Unsupported method: ${method}` },
    });
  } catch (err) {
    console.error("Lambda error:", err);
    return respond(500, {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: err.message || "Internal error" },
    });
  }
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,x-api-key",
    },
    body: JSON.stringify(body),
  };
}
