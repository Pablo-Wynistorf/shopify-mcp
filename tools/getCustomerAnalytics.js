const { handleToolError } = require("../lib/helpers");
const { executeShopifyQL } = require("../lib/shopifyql");

module.exports = {
  name: "get-customer-analytics",
  description:
    "Customer cohort and behavior analytics. Analyze new vs returning customers, " +
    "customer acquisition over time, or top customers by spend. " +
    "Uses ShopifyQL analytics (requires read_reports scope).",
  inputSchema: {
    type: "object",
    properties: {
      report: {
        type: "string",
        enum: ["new_vs_returning", "acquisition_over_time", "top_spenders", "by_country"],
        default: "new_vs_returning",
        description: "Type of customer report.",
      },
      period: {
        type: "string",
        enum: ["day", "week", "month", "quarter", "year"],
        default: "month",
        description: "Time granularity (for acquisition_over_time).",
      },
      startDate: { type: "string", description: "YYYY-MM-DD or relative like -12m" },
      endDate: { type: "string", description: "YYYY-MM-DD" },
      top: { type: "number", default: 20, description: "Number of results (for top_spenders, by_country)." },
    },
    required: ["report"],
  },
  execute: async (client, args = {}) => {
    try {
      const { report = "new_vs_returning", period = "month", startDate, endDate, top = 20 } = args;
      let q;

      switch (report) {
        case "new_vs_returning":
          q = `FROM sales SHOW total_sales, orders`;
          if (startDate) q += ` SINCE ${startDate}`;
          if (endDate) q += ` UNTIL ${endDate}`;
          q += ` GROUP BY customer_type ORDER BY total_sales DESC`;
          break;

        case "acquisition_over_time":
          q = `FROM customers SHOW new_customers`;
          if (startDate) q += ` SINCE ${startDate}`;
          if (endDate) q += ` UNTIL ${endDate}`;
          q += ` TIMESERIES ${period}`;
          break;

        case "top_spenders":
          q = `FROM customers SHOW customer_name, customer_email, total_spent, orders_count`;
          if (startDate) q += ` SINCE ${startDate}`;
          if (endDate) q += ` UNTIL ${endDate}`;
          q += ` GROUP BY customer_name, customer_email ORDER BY total_spent DESC LIMIT ${top}`;
          break;

        case "by_country":
          q = `FROM customers SHOW new_customers`;
          if (startDate) q += ` SINCE ${startDate}`;
          if (endDate) q += ` UNTIL ${endDate}`;
          q += ` GROUP BY customer_country ORDER BY new_customers DESC LIMIT ${top}`;
          break;
      }

      const result = await executeShopifyQL(client, q);
      if (result.error) return result;
      return {
        customerAnalytics: result.rows,
        meta: { report, queryUsed: result.queryUsed },
      };
    } catch (error) { handleToolError("analyze customers", error); }
  },
};
