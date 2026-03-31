const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "create-fulfillment",
  description: "Create a fulfillment (mark items as shipped) with optional tracking info and customer notification.",
  inputSchema: {
    type: "object",
    properties: {
      lineItemsByFulfillmentOrder: { type: "array", minItems: 1, description: "Fulfillment orders and their line items to fulfill", items: { type: "object", properties: { fulfillmentOrderId: { type: "string" }, fulfillmentOrderLineItems: { type: "array", items: { type: "object", properties: { id: { type: "string" }, quantity: { type: "number" } }, required: ["id","quantity"] } } }, required: ["fulfillmentOrderId"] } },
      trackingInfo: { type: "object", properties: { number: { type: "string" }, url: { type: "string" }, company: { type: "string" } }, description: "Tracking information" },
      notifyCustomer: { type: "boolean", default: false },
    },
    required: ["lineItemsByFulfillmentOrder"],
  },
  execute: async (client, args) => {
    try {
      const q = gql`mutation fulfillmentCreate($fulfillment:FulfillmentInput!){fulfillmentCreate(fulfillment:$fulfillment){fulfillment{id status createdAt trackingInfo{number url company} fulfillmentLineItems(first:20){edges{node{id quantity lineItem{title}}}}} userErrors{field message}}}`;
      const fulfillment = { lineItemsByFulfillmentOrder: args.lineItemsByFulfillmentOrder, notifyCustomer: args.notifyCustomer };
      if (args.trackingInfo) fulfillment.trackingInfo = args.trackingInfo;
      const data = await client.request(q, { fulfillment });
      checkUserErrors(data.fulfillmentCreate.userErrors, "create fulfillment");
      const f = data.fulfillmentCreate.fulfillment;
      return { fulfillment: { id: f.id, status: f.status, createdAt: f.createdAt, trackingInfo: f.trackingInfo, lineItems: f.fulfillmentLineItems.edges.map((e) => ({ id: e.node.id, quantity: e.node.quantity, title: e.node.lineItem.title })) } };
    } catch (error) { handleToolError("create fulfillment", error); }
  },
};
