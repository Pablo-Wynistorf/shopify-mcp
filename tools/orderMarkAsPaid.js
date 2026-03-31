const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "order-mark-as-paid",
  description: "Mark an order as paid. Useful for manual/offline payments.",
  inputSchema: { type: "object", properties: { orderId: { type: "string", description: "The order GID" } }, required: ["orderId"] },
  execute: async (client, args) => {
    try {
      const q = gql`mutation orderMarkAsPaid($input:OrderMarkAsPaidInput!){orderMarkAsPaid(input:$input){order{id name displayFinancialStatus totalPriceSet{shopMoney{amount currencyCode}}} userErrors{field message}}}`;
      const data = await client.request(q, { input: { id: args.orderId } });
      checkUserErrors(data.orderMarkAsPaid.userErrors, "mark order as paid");
      return { order: data.orderMarkAsPaid.order };
    } catch (error) { handleToolError("mark order as paid", error); }
  },
};
