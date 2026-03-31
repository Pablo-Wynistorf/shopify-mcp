const { gql, handleToolError, edgesToNodes, formatOrderSummary } = require("../lib/helpers");

module.exports = {
  name: "get-orders",
  description: "Get orders with optional filtering by status",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["any","open","closed","cancelled"], default: "any" },
      limit: { type: "number", default: 10 },
      after: { type: "string", description: "Cursor for forward pagination" },
      before: { type: "string", description: "Cursor for backward pagination" },
      sortKey: { type: "string", enum: ["CREATED_AT","ORDER_NUMBER","TOTAL_PRICE","FINANCIAL_STATUS","FULFILLMENT_STATUS","UPDATED_AT","CUSTOMER_NAME","PROCESSED_AT","ID","RELEVANCE"], default: "CREATED_AT" },
      reverse: { type: "boolean", default: true },
      query: { type: "string", description: "Raw query string for advanced filtering" },
    },
  },
  execute: async (client, args = {}) => {
    try {
      const { status = "any", limit = 10, after, before, sortKey = "CREATED_AT", reverse = true, query: rawQuery } = args;
      const parts = [];
      if (status !== "any") parts.push(`status:${status}`);
      if (rawQuery) parts.push(rawQuery);
      const queryFilter = parts.join(" ") || undefined;
      const q = gql`query($first:Int!,$query:String,$after:String,$before:String,$sortKey:OrderSortKeys,$reverse:Boolean){orders(first:$first,query:$query,after:$after,before:$before,sortKey:$sortKey,reverse:$reverse){edges{node{id name createdAt displayFinancialStatus displayFulfillmentStatus totalPriceSet{shopMoney{amount currencyCode}} subtotalPriceSet{shopMoney{amount currencyCode}} totalShippingPriceSet{shopMoney{amount currencyCode}} totalTaxSet{shopMoney{amount currencyCode}} customer{id firstName lastName defaultEmailAddress{emailAddress}} shippingAddress{address1 address2 city provinceCode zip country phone} lineItems(first:10){edges{node{id title quantity originalTotalSet{shopMoney{amount currencyCode}} variant{id title sku}}}} tags note}}pageInfo{hasNextPage hasPreviousPage startCursor endCursor}}}`;
      const data = await client.request(q, { first: limit, query: queryFilter, after, before, sortKey, reverse });
      return { orders: edgesToNodes(data.orders).map(formatOrderSummary), pageInfo: data.orders.pageInfo };
    } catch (error) { handleToolError("fetch orders", error); }
  },
};
