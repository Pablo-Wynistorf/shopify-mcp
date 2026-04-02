const { handleToolError } = require("../lib/helpers");
const { executeShopifyQL } = require("../lib/shopifyql");

module.exports = {
  name: "get-sales-over-time",
  description:
    "Sales trends over time with configurable granularity (day/week/month/quarter/year). " +
    "Shows total sales, order count, and average order value. Supports period comparison. " +
    "Uses ShopifyQL analytics (requires read_reports scope).",
  inputSchema: {
    type: "object",
    properties: {
      period: {
        type: "string",
        enum: ["day", "week", "month", "quarter", "year"],
        default: "month",
        description: "Time granularity for the trend.",
      },
      startDate: { type: "string", description: "YYYY-MM-DD or relative like -12m, -30d" },
      endDate: { type: "string", description: "YYYY-MM-DD" },
      compareTo: {
        type: "string",
        enum: ["previous_period", "previous_year"],
        description: "Optional period comparison.",
      },
    },
    required: ["period"],
  },
  execute: async (client, args = {}) => {
    try {
      const { period = "month", startDate, endDate, compareTo } = args;
      let q = `FROM sales SHOW total_sales, orders, average_order_value`;
      if (startDate) q += ` SINCE ${startDate}`;
      if (endDate) q += ` UNTIL ${endDate}`;
      q += ` TIMESERIES ${period}`;
      if (compareTo) q += ` COMPARE TO ${compareTo}`;

      const result = await executeShopifyQL(client, q);
      if (result.error) return result;
      return {
        salesTrend: result.rows,
        meta: { period, compareTo: compareTo || null, queryUsed: result.queryUsed },
      };
    } catch (error) { handleToolError("analyze sales over time", error); }
  },
};
