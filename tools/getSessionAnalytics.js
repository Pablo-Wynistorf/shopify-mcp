const { handleToolError } = require("../lib/helpers");
const { executeShopifyQL } = require("../lib/shopifyql");

module.exports = {
  name: "get-session-analytics",
  description:
    "Storefront traffic and conversion analytics. Sessions, visitors, conversion rate, " +
    "and add-to-cart rate over time or by referrer/landing page. " +
    "Uses ShopifyQL analytics (requires read_reports scope).",
  inputSchema: {
    type: "object",
    properties: {
      report: {
        type: "string",
        enum: ["traffic_over_time", "by_referrer", "by_landing_page", "by_device"],
        default: "traffic_over_time",
        description: "Type of session report.",
      },
      period: {
        type: "string",
        enum: ["day", "week", "month"],
        default: "day",
        description: "Time granularity (for traffic_over_time).",
      },
      startDate: { type: "string", description: "YYYY-MM-DD or relative like -30d" },
      endDate: { type: "string", description: "YYYY-MM-DD" },
      top: { type: "number", default: 20, description: "Number of results." },
    },
    required: ["report"],
  },
  execute: async (client, args = {}) => {
    try {
      const { report = "traffic_over_time", period = "day", startDate, endDate, top = 20 } = args;
      let q;

      switch (report) {
        case "traffic_over_time":
          q = `FROM sessions SHOW sessions, visitors, conversion_rate, added_to_cart_rate`;
          if (startDate) q += ` SINCE ${startDate}`;
          if (endDate) q += ` UNTIL ${endDate}`;
          q += ` TIMESERIES ${period}`;
          break;

        case "by_referrer":
          q = `FROM sessions SHOW sessions, visitors, conversion_rate`;
          if (startDate) q += ` SINCE ${startDate}`;
          if (endDate) q += ` UNTIL ${endDate}`;
          q += ` GROUP BY referrer_source ORDER BY sessions DESC LIMIT ${top}`;
          break;

        case "by_landing_page":
          q = `FROM sessions SHOW sessions, visitors, conversion_rate`;
          if (startDate) q += ` SINCE ${startDate}`;
          if (endDate) q += ` UNTIL ${endDate}`;
          q += ` GROUP BY landing_page ORDER BY sessions DESC LIMIT ${top}`;
          break;

        case "by_device":
          q = `FROM sessions SHOW sessions, visitors, conversion_rate`;
          if (startDate) q += ` SINCE ${startDate}`;
          if (endDate) q += ` UNTIL ${endDate}`;
          q += ` GROUP BY device_type ORDER BY sessions DESC`;
          break;
      }

      const result = await executeShopifyQL(client, q);
      if (result.error) return result;
      return {
        sessionAnalytics: result.rows,
        meta: { report, queryUsed: result.queryUsed },
      };
    } catch (error) { handleToolError("analyze sessions", error); }
  },
};
