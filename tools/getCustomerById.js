const { gql, handleToolError, edgesToNodes } = require("../lib/helpers");

module.exports = {
  name: "get-customer-by-id",
  description: "Get a single customer by ID",
  inputSchema: { type: "object", properties: { id: { type: "string", pattern: "^\\d+$" } }, required: ["id"] },
  execute: async (client, args) => {
    try {
      const gid = `gid://shopify/Customer/${args.id}`;
      const q = gql`query($id:ID!){customer(id:$id){id firstName lastName defaultEmailAddress{emailAddress} defaultPhoneNumber{phoneNumber} createdAt updatedAt tags note taxExempt defaultAddress{address1 address2 city provinceCode zip country phone} addressesV2(first:10){edges{node{address1 address2 city provinceCode zip country phone}}} amountSpent{amount currencyCode} numberOfOrders metafields(first:10){edges{node{id namespace key value}}}}}`;
      const data = await client.request(q, { id: gid });
      if (!data.customer) throw new Error(`Customer ${args.id} not found`);
      const c = data.customer;
      return { customer: { id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.defaultEmailAddress?.emailAddress || null, phone: c.defaultPhoneNumber?.phoneNumber || null, createdAt: c.createdAt, updatedAt: c.updatedAt, tags: c.tags, note: c.note, taxExempt: c.taxExempt, defaultAddress: c.defaultAddress, addresses: c.addressesV2 ? edgesToNodes(c.addressesV2) : [], amountSpent: c.amountSpent, numberOfOrders: c.numberOfOrders, metafields: edgesToNodes(c.metafields) } };
    } catch (error) { handleToolError("fetch customer", error); }
  },
};
