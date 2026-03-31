const { gql, handleToolError, edgesToNodes } = require("../lib/helpers");

module.exports = {
  name: "get-markets",
  description: "Get all markets with their regions, currencies, status, and web presence configuration",
  inputSchema: {
    type: "object",
    properties: { first: { type: "number", default: 25, minimum: 1, maximum: 50 } },
  },
  execute: async (client, args = {}) => {
    try {
      const q = gql`query GetMarkets($first:Int!){markets(first:$first){edges{node{id name handle status type currencySettings{baseCurrency{currencyCode currencyName} localCurrencies} webPresences(first:10){edges{node{id subfolderSuffix defaultLocale{locale name primary published} alternateLocales{locale name published} domain{id host url}}}}}}}}`;
      const data = await client.request(q, { first: args.first || 25 });
      const markets = edgesToNodes(data.markets).map((m) => ({ ...m, webPresences: m.webPresences ? edgesToNodes(m.webPresences) : [] }));
      return { marketsCount: markets.length, markets };
    } catch (error) { handleToolError("fetch markets", error); }
  },
};
