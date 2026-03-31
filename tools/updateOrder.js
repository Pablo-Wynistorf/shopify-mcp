const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "update-order",
  description: "Update an existing order with new information",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", minLength: 1 },
      tags: { type: "array", items: { type: "string" } },
      email: { type: "string", format: "email" },
      note: { type: "string" },
      customAttributes: { type: "array", items: { type: "object", properties: { key: { type: "string" }, value: { type: "string" } }, required: ["key","value"] } },
      metafields: { type: "array", items: { type: "object", properties: { id: { type: "string" }, namespace: { type: "string" }, key: { type: "string" }, value: { type: "string" }, type: { type: "string" } }, required: ["value"] } },
      phone: { type: "string" }, poNumber: { type: "string" },
      shippingAddress: { type: "object", properties: { address1: { type: "string" }, address2: { type: "string" }, city: { type: "string" }, company: { type: "string" }, countryCode: { type: "string" }, firstName: { type: "string" }, lastName: { type: "string" }, phone: { type: "string" }, provinceCode: { type: "string" }, zip: { type: "string" } } },
    },
    required: ["id"],
  },
  execute: async (client, args) => {
    try {
      const { id, ...fields } = args;
      const q = gql`mutation orderUpdate($input:OrderInput!){orderUpdate(input:$input){order{id name email note tags customAttributes{key value} metafields(first:10){edges{node{id namespace key value}}} shippingAddress{address1 address2 city company country firstName lastName phone province zip}} userErrors{field message}}}`;
      const data = await client.request(q, { input: { id, ...fields } });
      checkUserErrors(data.orderUpdate.userErrors, "update order");
      const o = data.orderUpdate.order;
      return { order: { id: o.id, name: o.name, email: o.email, note: o.note, tags: o.tags, customAttributes: o.customAttributes, metafields: o.metafields?.edges.map((e) => e.node) || [], shippingAddress: o.shippingAddress } };
    } catch (error) { handleToolError("update order", error); }
  },
};
