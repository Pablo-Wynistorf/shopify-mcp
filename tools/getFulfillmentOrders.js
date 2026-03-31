const { gql, handleToolError, edgesToNodes } = require("../lib/helpers");

module.exports = {
  name: "get-fulfillment-orders",
  description: "Get fulfillment orders for a given order, including status, assigned location, and line items.",
  inputSchema: {
    type: "object",
    properties: {
      orderId: { type: "string", minLength: 1, description: "The order GID (e.g. gid://shopify/Order/123)" },
      first: { type: "number", default: 10, description: "Number of fulfillment orders to return" },
    },
    required: ["orderId"],
  },
  execute: async (client, args) => {
    try {
      const q = gql`query($id:ID!,$first:Int!){order(id:$id){id name fulfillmentOrders(first:$first){edges{node{id status requestStatus assignedLocation{name address1 city provinceCode zip countryCode} lineItems(first:50){edges{node{id remainingQuantity totalQuantity lineItem{title sku variant{id title}}}}}}}}}}`;
      const data = await client.request(q, { id: args.orderId, first: args.first || 10 });
      if (!data.order) throw new Error(`Order ${args.orderId} not found`);
      const fulfillmentOrders = edgesToNodes(data.order.fulfillmentOrders).map((fo) => ({
        id: fo.id,
        status: fo.status,
        requestStatus: fo.requestStatus,
        assignedLocation: fo.assignedLocation,
        lineItems: edgesToNodes(fo.lineItems).map((li) => ({
          id: li.id,
          remainingQuantity: li.remainingQuantity,
          totalQuantity: li.totalQuantity,
          title: li.lineItem?.title,
          sku: li.lineItem?.sku,
          variantId: li.lineItem?.variant?.id,
        })),
      }));
      return { orderId: data.order.id, orderName: data.order.name, fulfillmentOrders };
    } catch (error) { handleToolError("fetch fulfillment orders", error); }
  },
};
