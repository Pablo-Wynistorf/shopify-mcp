const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "delete-customer",
  description: "Delete a customer",
  inputSchema: { type: "object", properties: { id: { type: "string", pattern: "^\\d+$" } }, required: ["id"] },
  execute: async (client, args) => {
    try {
      const gid = `gid://shopify/Customer/${args.id}`;
      const q = gql`mutation customerDelete($input:CustomerDeleteInput!){customerDelete(input:$input){deletedCustomerId userErrors{field message}}}`;
      const data = await client.request(q, { input: { id: gid } });
      checkUserErrors(data.customerDelete.userErrors, "delete customer");
      return { deletedCustomerId: data.customerDelete.deletedCustomerId };
    } catch (error) { handleToolError("delete customer", error); }
  },
};
