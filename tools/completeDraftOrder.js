const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "complete-draft-order",
  description: "Complete a draft order, converting it into a real order. Optionally specify a payment gateway.",
  inputSchema: {
    type: "object",
    properties: {
      draftOrderId: { type: "string", description: "The draft order GID, e.g. gid://shopify/DraftOrder/123" },
      paymentGatewayId: { type: "string", description: "Payment gateway GID (optional)" },
    },
    required: ["draftOrderId"],
  },
  execute: async (client, args) => {
    try {
      const q = gql`mutation draftOrderComplete($id:ID!,$paymentGatewayId:ID){draftOrderComplete(id:$id,paymentGatewayId:$paymentGatewayId){draftOrder{id status order{id name displayFinancialStatus displayFulfillmentStatus totalPriceSet{shopMoney{amount currencyCode}}}} userErrors{field message}}}`;
      const variables = { id: args.draftOrderId };
      if (args.paymentGatewayId) variables.paymentGatewayId = args.paymentGatewayId;
      const data = await client.request(q, variables);
      checkUserErrors(data.draftOrderComplete.userErrors, "complete draft order");
      const d = data.draftOrderComplete.draftOrder;
      return { draftOrder: { id: d.id, status: d.status, order: d.order ? { id: d.order.id, name: d.order.name, financialStatus: d.order.displayFinancialStatus, fulfillmentStatus: d.order.displayFulfillmentStatus, totalPrice: d.order.totalPriceSet?.shopMoney } : null } };
    } catch (error) { handleToolError("complete draft order", error); }
  },
};
