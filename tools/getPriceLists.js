const { gql, handleToolError, edgesToNodes } = require("../lib/helpers");

module.exports = {
  name: "get-price-lists",
  description: "Get all price lists with their currency, fixed/relative adjustments, and associated catalog context",
  inputSchema: { type: "object", properties: { first: { type: "number", default: 25, minimum: 1, maximum: 50 } } },
  execute: async (client, args = {}) => {
    try {
      const q = gql`query GetPriceLists($first:Int!){priceLists(first:$first){edges{node{id name currency fixedPricesCount parent{adjustment{type value}} catalog{...on MarketCatalog{id title}} prices(first:10){edges{node{variant{id title product{id title}} price{amount currencyCode} compareAtPrice{amount currencyCode} originType}}}}}}}`;
      const data = await client.request(q, { first: args.first || 25 });
      const priceLists = edgesToNodes(data.priceLists).map((pl) => ({ ...pl, prices: edgesToNodes(pl.prices) }));
      return { priceListsCount: priceLists.length, priceLists };
    } catch (error) { handleToolError("fetch price lists", error); }
  },
};
