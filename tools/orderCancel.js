const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "order-cancel",
  description: "Cancel an order with options for refunding, restocking inventory, and customer notification.",
  inputSchema: {
    type: "object",
    properties: {
      orderId: { type: "string", description: "The order GID" },
      reason: { type: "string", enum: ["CUSTOMER","DECLINED","FRAUD","INVENTORY","OTHER","STAFF"] },
      restock: { type: "boolean", description: "Whether to restock inventory" },
      notifyCustomer: { type: "boolean", default: false },
      staffNote: { type: "string", description: "Internal note" },
      refund: { type: "boolean", description: "Whether to refund to the original payment method" },
    },
    required: ["orderId", "reason", "restock"],
  },
  execute: async (client, args) => {
    try {
      const q = gql`mutation orderCancel($orderId:ID!,$reason:OrderCancelReason!,$restock:Boolean!,$notifyCustomer:Boolean,$staffNote:String,$refundMethod:OrderCancelRefundMethodInput){orderCancel(orderId:$orderId,reason:$reason,restock:$restock,notifyCustomer:$notifyCustomer,staffNote:$staffNote,refundMethod:$refundMethod){job{id done} orderCancelUserErrors{field message code}}}`;
      const variables = { orderId: args.orderId, reason: args.reason, restock: args.restock, notifyCustomer: args.notifyCustomer, ...(args.staffNote && { staffNote: args.staffNote }) };
      if (args.refund !== undefined) variables.refundMethod = { originalPaymentMethodsRefund: args.refund };
      const data = await client.request(q, variables);
      checkUserErrors(data.orderCancel.orderCancelUserErrors, "cancel order");
      return { job: data.orderCancel.job, message: "Order cancellation initiated successfully" };
    } catch (error) { handleToolError("cancel order", error); }
  },
};
