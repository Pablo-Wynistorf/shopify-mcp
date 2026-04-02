const { handleToolError } = require("../lib/helpers");
const { executeShopifyQL } = require("../lib/shopifyql");

module.exports = {
  name: "get-best-sellers",
  description:
    "Ranked list of best-selling products by units sold or revenue. " +
    "Uses ShopifyQL analytics (requires read_reports scope).",
  inputSchema: {
    type: "object",
    properties: {
      metric: {
        type: "string",
        enum: ["ordered_product_quantity", "total_sales"],
        default: "ordered_product_quantity",
        description: "Rank by units sold or revenue.",
      },
      startDate: { type: "string", description: "YYYY-MM-DD or relative like -12m, -30d" },
      endDate: { type: "string", description: "YYYY-MM-DD" },
      top: { type: "number", default: 10, description: "Number of results." },
    },
  },
  execute: async (client, args = {}) => {
    try {
      const { metric = "ordered_product_quantity", startDate, endDate, top = 10 } = args;
      let q = `FROM products SHOW product_title, ${metric}`;
      if (startDate) q += ` SINCE ${startDate}`;
      if (endDate) q += ` UNTIL ${endDate}`;
      q += ` GROUP BY product_title ORDER BY ${metric} DESC LIMIT ${top}`;

      const result = await executeShopifyQL(client, q);
      if (result.error) return result;
      return {
        bestSellers: result.rows.map((r, i) => ({ rank: i + 1, ...r })),
        meta: { metric, dateRange: { from: startDate || "all-time", to: endDate || "present" }, queryUsed: result.queryUsed },
      };
    } catch (error) { handleToolError("analyze best sellers", error); }
  },
};
