const { gql, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "get-order-transactions",
  description: "Get all payment transactions for an order including authorizations, captures, refunds, and voids",
  inputSchema: { type: "object", properties: { orderId: { type: "string", minLength: 1, description: "The order ID (GID or just number)" } }, required: ["orderId"] },
  execute: async (client, args) => {
    try {
      const orderId = args.orderId.startsWith("gid://") ? args.orderId : `gid://shopify/Order/${args.orderId}`;
      const q = gql`query GetOrderTransactions($id:ID!){order(id:$id){id name transactions{id kind status gateway formattedGateway amountSet{shopMoney{amount currencyCode}presentmentMoney{amount currencyCode}} processedAt createdAt authorizationCode authorizationExpiresAt errorCode test parentTransaction{id kind} paymentDetails{...on CardPaymentDetails{company number name}} receiptJson}}}`;
      const data = await client.request(q, { id: orderId });
      if (!data.order) throw new Error(`Order not found: ${orderId}`);
      return { orderId: data.order.id, orderName: data.order.name, transactionsCount: data.order.transactions.length, transactions: data.order.transactions };
    } catch (error) { handleToolError("fetch order transactions", error); }
  },
};
