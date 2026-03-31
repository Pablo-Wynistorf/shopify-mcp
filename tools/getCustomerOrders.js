const { gql, handleToolError, edgesToNodes, formatOrderSummary } = require("../lib/helpers");

module.exports = {
  name: "get-customer-orders",
  description: "Get orders for a specific customer",
  inputSchema: {
    type: "object",
    properties: {
      customerId: { type: "string", pattern: "^\\d+$" },
      limit: { type: "number", default: 10 },
      after: { type: "string" }, before: { type: "string" },
      sortKey: { type: "string", enum: ["CREATED_AT","ORDER_NUMBER","TOTAL_PRICE","FINANCIAL_STATUS","FULFILLMENT_STATUS","UPDATED_AT","CUSTOMER_NAME","PROCESSED_AT","ID","RELEVANCE"], default: "CREATED_AT" },
      reverse: { type: "boolean", default: true },
    },
    required: ["customerId"],
  },
  execute: async (client, args) => {
    try {
      const { customerId, limit = 10, after, before, sortKey = "CREATED_AT", reverse = true } = args;
      const q = gql`query($query:String!,$first:Int!,$after:String,$before:String,$sortKey:OrderSortKeys,$reverse:Boolean){orders(query:$query,first:$first,after:$after,before:$before,sortKey:$sortKey,reverse:$reverse){edges{node{id name createdAt displayFinancialStatus displayFulfillmentStatus totalPriceSet{shopMoney{amount currencyCode}} subtotalPriceSet{shopMoney{amount currencyCode}} totalShippingPriceSet{shopMoney{amount currencyCode}} totalTaxSet{shopMoney{amount currencyCode}} customer{id firstName lastName defaultEmailAddress{emailAddress}} lineItems(first:5){edges{node{id title quantity originalTotalSet{shopMoney{amount currencyCode}} variant{id title sku}}}} tags note}}pageInfo{hasNextPage hasPreviousPage startCursor endCursor}}}`;
      const data = await client.request(q, { query: `customer_id:${customerId}`, first: limit, after, before, sortKey, reverse });
      return { orders: edgesToNodes(data.orders).map(formatOrderSummary), pageInfo: data.orders.pageInfo };
    } catch (error) { handleToolError("fetch customer orders", error); }
  },
};
