const { getAccessToken } = require("./lib/shopifyAuth");
const { createShopifyClient } = require("./lib/shopifyClient");
const { tools } = require("./tools/registry");
const crypto = require("crypto");

/**
 * AWS Lambda handler — MCP Streamable-HTTP transport.
 *
 * The streamable-http protocol sends POST requests with
 * Accept: text/event-stream. The server wraps JSON-RPC
 * responses in SSE format (data: ... lines).
 */
exports.handler = async (event) => {
  const httpMethod = event.httpMethod || event.requestContext?.http?.method;
  const headers = normalizeHeaders(event.headers || {});
  const accept = headers["accept"] || "";
  const wantSSE = accept.includes("text/event-stream");

  // GET — client wants to open SSE stream (not supported)
  if (httpMethod === "GET") {
    return wantSSE
      ? respondSSE(200, [], null, true)
      : respond(405, { error: "GET not supported" });
  }

  // DELETE — session close (no-op)
  if (httpMethod === "DELETE") return respond(200, {});

  // OPTIONS — CORS preflight
  if (httpMethod === "OPTIONS") return respond(200, {});

  if (httpMethod !== "POST") {
    return respond(405, { error: `Method ${httpMethod} not allowed` });
  }

  // ── POST: JSON-RPC ────────────────────────────────────────────────
  try {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body || event;

    const { id, method, params } = body;
    const sessionId = headers["mcp-session-id"] || crypto.randomUUID();

    // Credentials from headers
    const credentials = {
      clientId: headers["x-shopify-client-id"],
      clientSecret: headers["x-shopify-client-secret"],
      shopDomain: headers["x-shopify-shop-domain"],
    };

    // ── initialize ──────────────────────────────────────────────────
    if (method === "initialize") {
      const result = {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2025-03-26",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "shopify-mcp", version: "1.0.0" },
        },
      };
      return wantSSE
        ? respondSSE(200, [result], sessionId)
        : respond(200, result, sessionId);
    }

    // ── notifications (no id = no response expected) ────────────────
    if (id === undefined || id === null) {
      return respond(202, null, sessionId);
    }

    // ── tools/list ──────────────────────────────────────────────────
    if (method === "tools/list") {
      const toolList = Object.entries(tools).map(([name, t]) => ({
        name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));
      const result = { jsonrpc: "2.0", id, result: { tools: toolList } };
      return wantSSE
        ? respondSSE(200, [result], sessionId)
        : respond(200, result, sessionId);
    }

    // ── tools/call ──────────────────────────────────────────────────
    if (method === "tools/call") {
      if (!credentials?.clientId || !credentials?.clientSecret || !credentials?.shopDomain) {
        const err = {
          jsonrpc: "2.0", id,
          error: { code: -32600, message: "Missing credentials (clientId, clientSecret, shopDomain)." },
        };
        return wantSSE ? respondSSE(200, [err], sessionId) : respond(200, err, sessionId);
      }

      const { clientId, clientSecret, shopDomain } = credentials;

      if (!/^[a-z0-9-]+\.myshopify\.com$/i.test(shopDomain)) {
        const err = {
          jsonrpc: "2.0", id,
          error: { code: -32600, message: "Invalid shopDomain format." },
        };
        return wantSSE ? respondSSE(200, [err], sessionId) : respond(200, err, sessionId);
      }

      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (!toolName || !tools[toolName]) {
        const err = {
          jsonrpc: "2.0", id,
          error: { code: -32601, message: `Unknown tool: ${toolName}` },
        };
        return wantSSE ? respondSSE(200, [err], sessionId) : respond(200, err, sessionId);
      }

      const accessToken = await getAccessToken(clientId, clientSecret, shopDomain);
      const client = createShopifyClient(shopDomain, accessToken);
      const toolResult = await tools[toolName].execute(client, toolArgs);

      const result = {
        jsonrpc: "2.0", id,
        result: { content: [{ type: "text", text: JSON.stringify(toolResult) }] },
      };
      return wantSSE
        ? respondSSE(200, [result], sessionId)
        : respond(200, result, sessionId);
    }

    // ── Unknown method ──────────────────────────────────────────────
    const err = {
      jsonrpc: "2.0", id: id || null,
      error: { code: -32601, message: `Unsupported method: ${method}` },
    };
    return wantSSE ? respondSSE(200, [err], sessionId) : respond(200, err, sessionId);

  } catch (err) {
    console.error("Lambda error:", err);
    const errResp = {
      jsonrpc: "2.0", id: null,
      error: { code: -32603, message: err.message || "Internal error" },
    };
    return wantSSE ? respondSSE(500, [errResp]) : respond(500, errResp);
  }
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,x-api-key,mcp-session-id,Accept,x-shopify-client-id,x-shopify-client-secret,x-shopify-shop-domain",
  "Access-Control-Allow-Methods": "POST,GET,DELETE,OPTIONS",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

function normalizeHeaders(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k.toLowerCase()] = v;
  }
  return out;
}

/** Plain JSON response */
function respond(statusCode, body, sessionId) {
  const headers = { ...CORS_HEADERS, "Content-Type": "application/json" };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  return { statusCode, headers, body: body ? JSON.stringify(body) : "" };
}

/** SSE-formatted response — wraps JSON-RPC messages as SSE events */
function respondSSE(statusCode, messages, sessionId, emptyStream) {
  const headers = { ...CORS_HEADERS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" };
  if (sessionId) headers["mcp-session-id"] = sessionId;

  let body = "";
  if (!emptyStream && messages) {
    for (const msg of messages) {
      body += `event: message\ndata: ${JSON.stringify(msg)}\n\n`;
    }
  }

  return { statusCode, headers, body };
}
