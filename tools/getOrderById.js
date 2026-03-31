const { gql, handleToolError, edgesToNodes, formatOrderSummary } = require("../lib/helpers");

module.exports = {
  name: "get-order-by-id",
  description: "Get a specific order by ID",
  inputSchema: { type: "object", properties: { orderId: { type: "string", minLength: 1 } }, required: ["orderId"] },
  execute: async (client, args) => {
    try {
      const q = gql`query($id:ID!){order(id:$id){id name createdAt displayFinancialStatus displayFulfillmentStatus totalPriceSet{shopMoney{amount currencyCode}} subtotalPriceSet{shopMoney{amount currencyCode}} totalShippingPriceSet{shopMoney{amount currencyCode}} totalTaxSet{shopMoney{amount currencyCode}} customer{id firstName lastName defaultEmailAddress{emailAddress} defaultPhoneNumber{phoneNumber}} shippingAddress{address1 address2 city provinceCode zip country phone} billingAddress{address1 address2 city provinceCode zip country company phone firstName lastName} lineItems(first:20){edges{node{id title quantity originalTotalSet{shopMoney{amount currencyCode}} variant{id title sku}}}} tags note cancelReason cancelledAt updatedAt returnStatus processedAt poNumber discountCodes currentTotalPriceSet{shopMoney{amount currencyCode}} metafields(first:20){edges{node{id namespace key value type}}}}}`;
      const data = await client.request(q, { id: args.orderId });
      if (!data.order) throw new Error(`Order ${args.orderId} not found`);
      const o = data.order;
      const base = formatOrderSummary(o);
      return { order: { ...base, customer: o.customer ? { ...base.customer, phone: o.customer.defaultPhoneNumber?.phoneNumber || null } : null, billingAddress: o.billingAddress, cancelReason: o.cancelReason, cancelledAt: o.cancelledAt, updatedAt: o.updatedAt, returnStatus: o.returnStatus, processedAt: o.processedAt, poNumber: o.poNumber, discountCodes: o.discountCodes, currentTotalPrice: o.currentTotalPriceSet?.shopMoney, metafields: edgesToNodes(o.metafields) } };
    } catch (error) { handleToolError("fetch order", error); }
  },
};
