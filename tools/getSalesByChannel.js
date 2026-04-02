const { handleToolError } = require("../lib/helpers");
const { executeShopifyQL } = require("../lib/shopifyql");

module.exports = {
  name: "get-sales-by-channel",
  description:
    "Sales breakdown by channel (Online Store, POS, Draft Orders, etc.). " +
    "Shows revenue, order count, and average order value per channel. " +
    "Uses ShopifyQL analytics (requires read_reports scope).",
  inputSchema: {
    type: "object",
    properties: {
      startDate: { type: "string", description: "YYYY-MM-DD or relative like -12m, -30d" },
      endDate: { type: "string", description: "YYYY-MM-DD" },
    },
  },
  execute: async (client, args = {}) => {
    try {
      const { startDate, endDate } = args;
      let q = `FROM sales SHOW total_sales, orders, average_order_value`;
      if (startDate) q += ` SINCE ${startDate}`;
      if (endDate) q += ` UNTIL ${endDate}`;
      q += ` GROUP BY channel_title ORDER BY total_sales DESC`;

      const result = await executeShopifyQL(client, q);
      if (result.error) return result;
      return {
        salesByChannel: result.rows,
        meta: { queryUsed: result.queryUsed },
      };
    } catch (error) { handleToolError("analyze sales by channel", error); }
  },
};
