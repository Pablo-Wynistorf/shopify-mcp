const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "order-close-open",
  description: "Close or reopen an order.",
  inputSchema: {
    type: "object",
    properties: {
      orderId: { type: "string", description: "The order GID" },
      action: { type: "string", enum: ["close", "open"] },
    },
    required: ["orderId", "action"],
  },
  execute: async (client, args) => {
    try {
      if (args.action === "close") {
        const q = gql`mutation orderClose($input:OrderCloseInput!){orderClose(input:$input){order{id name closed closedAt} userErrors{field message}}}`;
        const data = await client.request(q, { input: { id: args.orderId } });
        checkUserErrors(data.orderClose.userErrors, "close order");
        return { order: data.orderClose.order };
      } else {
        const q = gql`mutation orderOpen($input:OrderOpenInput!){orderOpen(input:$input){order{id name closed closedAt} userErrors{field message}}}`;
        const data = await client.request(q, { input: { id: args.orderId } });
        checkUserErrors(data.orderOpen.userErrors, "open order");
        return { order: data.orderOpen.order };
      }
    } catch (error) { handleToolError(`${args.action} order`, error); }
  },
};
