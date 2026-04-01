const { getAccessToken } = require("./lib/shopifyAuth");
const { createShopifyClient } = require("./lib/shopifyClient");
const { tools } = require("./tools/registry");
const { categories } = require("./tools/categories");
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
      const compact = headers["x-tool-mode"] !== "full";
      let toolList;

      if (compact) {
        // Compact mode: expose one tool per category + a describe helper.
        // This reduces ~40 tool definitions down to ~6, saving thousands
        // of input tokens on every request.
        toolList = Object.entries(categories).map(([catName, cat]) => ({
          name: catName,
          description: cat.description,
          inputSchema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                description: `The action to run. One of: ${cat.actions.join(", ")}`,
              },
              arguments: {
                type: "object",
                description: "Arguments for the action. Call shopify-describe first to see the schema.",
              },
            },
            required: ["action"],
          },
        }));
        // Add a describe tool so the model can discover schemas on-demand
        toolList.push({
          name: "shopify-describe",
          description:
            "Returns the full inputSchema for a specific action. " +
            "Call this before calling a category tool if you need to know the accepted parameters.",
          inputSchema: {
            type: "object",
            properties: {
              action: { type: "string", description: "The action name, e.g. create-product" },
            },
            required: ["action"],
          },
        });
      } else {
        // Full mode: expose every tool individually (original behavior)
        toolList = Object.entries(tools).map(([name, t]) => ({
          name,
          description: t.description,
          inputSchema: t.inputSchema,
        }));
      }

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

      // ── shopify-describe: return schema for a specific action ─────
      if (toolName === "shopify-describe") {
        const actionName = toolArgs.action;
        if (!actionName || !tools[actionName]) {
          const err = {
            jsonrpc: "2.0", id,
            error: { code: -32601, message: `Unknown action: ${actionName}` },
          };
          return wantSSE ? respondSSE(200, [err], sessionId) : respond(200, err, sessionId);
        }
        const schema = {
          name: actionName,
          description: tools[actionName].description,
          inputSchema: tools[actionName].inputSchema,
        };
        const result = {
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: JSON.stringify(schema) }] },
        };
        return wantSSE
          ? respondSSE(200, [result], sessionId)
          : respond(200, result, sessionId);
      }

      // ── Category-based call: resolve the real action name ─────────
      let resolvedToolName = toolName;
      let resolvedArgs = toolArgs;

      if (categories[toolName]) {
        // Called via a category tool — the real action is in args.action
        resolvedToolName = toolArgs.action;
        resolvedArgs = toolArgs.arguments || {};
        if (!resolvedToolName || !categories[toolName].actions.includes(resolvedToolName)) {
          const err = {
            jsonrpc: "2.0", id,
            error: {
              code: -32601,
              message: `Unknown action "${resolvedToolName}" for ${toolName}. Valid: ${categories[toolName].actions.join(", ")}`,
            },
          };
          return wantSSE ? respondSSE(200, [err], sessionId) : respond(200, err, sessionId);
        }
      }

      if (!resolvedToolName || !tools[resolvedToolName]) {
        const err = {
          jsonrpc: "2.0", id,
          error: { code: -32601, message: `Unknown tool: ${resolvedToolName}` },
        };
        return wantSSE ? respondSSE(200, [err], sessionId) : respond(200, err, sessionId);
      }

      const accessToken = await getAccessToken(clientId, clientSecret, shopDomain);
      const client = createShopifyClient(shopDomain, accessToken);
      const toolResult = await tools[resolvedToolName].execute(client, resolvedArgs);

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
  "Access-Control-Allow-Headers": "Content-Type,x-api-key,mcp-session-id,Accept,x-shopify-client-id,x-shopify-client-secret,x-shopify-shop-domain,x-tool-mode",
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
