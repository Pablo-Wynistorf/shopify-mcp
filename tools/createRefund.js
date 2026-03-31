const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "refund-create",
  description: "Create a full or partial refund for an order with optional restocking and shipping refund.",
  inputSchema: {
    type: "object",
    properties: {
      orderId: { type: "string", description: "The order GID" },
      refundLineItems: { type: "array", items: { type: "object", properties: { lineItemId: { type: "string" }, quantity: { type: "number" }, restockType: { type: "string", enum: ["CANCEL","NO_RESTOCK","RETURN"] }, locationId: { type: "string" } }, required: ["lineItemId","quantity"] } },
      shipping: { type: "object", properties: { amount: { type: "string" }, fullRefund: { type: "boolean" } } },
      note: { type: "string" }, notify: { type: "boolean" },
      currency: { type: "string", description: "Currency code if different from shop currency" },
    },
    required: ["orderId"],
  },
  execute: async (client, args) => {
    try {
      const q = gql`mutation refundCreate($input:RefundInput!){refundCreate(input:$input){refund{id createdAt note totalRefundedSet{shopMoney{amount currencyCode}} refundLineItems(first:20){edges{node{lineItem{id title} quantity restockType}}}} userErrors{field message}}}`;
      const refundInput = { orderId: args.orderId };
      if (args.refundLineItems) refundInput.refundLineItems = args.refundLineItems;
      if (args.shipping) refundInput.shipping = args.shipping;
      if (args.note) refundInput.note = args.note;
      if (args.notify !== undefined) refundInput.notify = args.notify;
      if (args.currency) refundInput.currency = args.currency;
      const data = await client.request(q, { input: refundInput });
      checkUserErrors(data.refundCreate.userErrors, "create refund");
      const r = data.refundCreate.refund;
      return { refund: { id: r.id, createdAt: r.createdAt, note: r.note, totalRefunded: r.totalRefundedSet?.shopMoney, lineItems: r.refundLineItems.edges.map((e) => ({ lineItemId: e.node.lineItem.id, title: e.node.lineItem.title, quantity: e.node.quantity, restockType: e.node.restockType })) } };
    } catch (error) { handleToolError("create refund", error); }
  },
};
