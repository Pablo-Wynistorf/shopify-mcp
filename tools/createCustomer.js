const { gql, checkUserErrors, handleToolError, edgesToNodes } = require("../lib/helpers");

module.exports = {
  name: "create-customer",
  description: "Create a new customer",
  inputSchema: {
    type: "object",
    properties: {
      firstName: { type: "string" }, lastName: { type: "string" },
      email: { type: "string", format: "email" }, phone: { type: "string" },
      tags: { type: "array", items: { type: "string" } }, note: { type: "string" }, taxExempt: { type: "boolean" },
      metafields: { type: "array", items: { type: "object", properties: { namespace: { type: "string" }, key: { type: "string" }, value: { type: "string" }, type: { type: "string" } }, required: ["namespace","key","value"] } },
      addresses: { type: "array", items: { type: "object", properties: { address1:{type:"string"},address2:{type:"string"},city:{type:"string"},provinceCode:{type:"string"},zip:{type:"string"},countryCode:{type:"string"},phone:{type:"string"} } } },
    },
  },
  execute: async (client, args) => {
    try {
      const q = gql`mutation customerCreate($input:CustomerInput!){customerCreate(input:$input){customer{id firstName lastName defaultEmailAddress{emailAddress} defaultPhoneNumber{phoneNumber} tags note taxExempt createdAt updatedAt defaultAddress{address1 address2 city provinceCode zip country phone} addressesV2(first:10){edges{node{address1 address2 city provinceCode zip country phone}}} metafields(first:10){edges{node{id namespace key value}}}} userErrors{field message}}}`;
      const data = await client.request(q, { input: args });
      checkUserErrors(data.customerCreate.userErrors, "create customer");
      const c = data.customerCreate.customer;
      return { customer: { id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.defaultEmailAddress?.emailAddress || null, phone: c.defaultPhoneNumber?.phoneNumber || null, tags: c.tags, note: c.note, taxExempt: c.taxExempt, createdAt: c.createdAt, updatedAt: c.updatedAt, defaultAddress: c.defaultAddress, addresses: c.addressesV2 ? edgesToNodes(c.addressesV2) : [], metafields: c.metafields?.edges.map((e) => e.node) || [] } };
    } catch (error) { handleToolError("create customer", error); }
  },
};
