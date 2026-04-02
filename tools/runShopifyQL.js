const { handleToolError } = require("../lib/helpers");
const { executeShopifyQL } = require("../lib/shopifyql");

module.exports = {
  name: "run-shopifyql",
  description:
    "Execute a raw ShopifyQL query for custom analytics. " +
    "Available tables: sales, orders, products, customers, sessions. " +
    "Syntax: FROM <table> SHOW <metrics> [WHERE ...] [SINCE ...] [UNTIL ...] " +
    "[GROUP BY ...] [TIMESERIES ...] [COMPARE TO ...] [ORDER BY ...] [LIMIT ...]. " +
    "Uses ShopifyQL analytics (requires read_reports scope).",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "A ShopifyQL query string. Example: FROM sales SHOW total_sales, orders SINCE -12m TIMESERIES month",
      },
    },
    required: ["query"],
  },
  execute: async (client, args = {}) => {
    try {
      const { query } = args;
      if (!query) throw new Error("query parameter is required");

      const result = await executeShopifyQL(client, query);
      if (result.error) return result;
      return {
        results: result.rows,
        columns: result.columns?.map((c) => ({ name: c.name, type: c.dataType, displayName: c.displayName })),
        meta: { queryUsed: result.queryUsed },
      };
    } catch (error) { handleToolError("run ShopifyQL query", error); }
  },
};
