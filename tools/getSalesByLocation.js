const { handleToolError } = require("../lib/helpers");
const { executeShopifyQL } = require("../lib/shopifyql");

module.exports = {
  name: "get-sales-by-location",
  description:
    "Sales breakdown by billing country or region. " +
    "Shows revenue and order count per geographic location. " +
    "Uses ShopifyQL analytics (requires read_reports scope).",
  inputSchema: {
    type: "object",
    properties: {
      groupBy: {
        type: "string",
        enum: ["billing_country", "billing_region"],
        default: "billing_country",
        description: "Geographic dimension to group by.",
      },
      startDate: { type: "string", description: "YYYY-MM-DD or relative like -12m" },
      endDate: { type: "string", description: "YYYY-MM-DD" },
      top: { type: "number", default: 20, description: "Number of results." },
    },
  },
  execute: async (client, args = {}) => {
    try {
      const { groupBy = "billing_country", startDate, endDate, top = 20 } = args;
      let q = `FROM sales SHOW total_sales, orders`;
      if (startDate) q += ` SINCE ${startDate}`;
      if (endDate) q += ` UNTIL ${endDate}`;
      q += ` GROUP BY ${groupBy} ORDER BY total_sales DESC LIMIT ${top}`;

      const result = await executeShopifyQL(client, q);
      if (result.error) return result;
      return {
        salesByLocation: result.rows,
        meta: { groupBy, queryUsed: result.queryUsed },
      };
    } catch (error) { handleToolError("analyze sales by location", error); }
  },
};
