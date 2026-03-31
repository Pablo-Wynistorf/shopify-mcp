const { gql, handleToolError, edgesToNodes } = require("../lib/helpers");

module.exports = {
  name: "get-order-refund-details",
  description: "Get detailed refund info for an order including refunded items, amounts, restock status, and associated transactions",
  inputSchema: { type: "object", properties: { orderId: { type: "string", minLength: 1 } }, required: ["orderId"] },
  execute: async (client, args) => {
    try {
      const orderId = args.orderId.startsWith("gid://") ? args.orderId : `gid://shopify/Order/${args.orderId}`;
      const q = gql`query($id:ID!){order(id:$id){id name refunds(first:25){id note createdAt updatedAt totalRefundedSet{shopMoney{amount currencyCode}presentmentMoney{amount currencyCode}} refundLineItems(first:50){edges{node{quantity restockType restocked priceSet{shopMoney{amount currencyCode}} subtotalSet{shopMoney{amount currencyCode}} totalTaxSet{shopMoney{amount currencyCode}} lineItem{id title sku} location{id name}}}} transactions(first:10){edges{node{id kind status gateway amountSet{shopMoney{amount currencyCode}} processedAt}}} duties{amountSet{shopMoney{amount currencyCode}}}}}}`;
      const data = await client.request(q, { id: orderId });
      if (!data.order) throw new Error(`Order not found: ${orderId}`);
      const refunds = data.order.refunds.map((r) => ({ ...r, refundLineItems: edgesToNodes(r.refundLineItems), transactions: edgesToNodes(r.transactions) }));
      return { orderId: data.order.id, orderName: data.order.name, refundsCount: refunds.length, refunds };
    } catch (error) { handleToolError("fetch order refund details", error); }
  },
};
