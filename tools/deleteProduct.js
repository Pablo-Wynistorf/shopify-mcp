const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "delete-product",
  description: "Delete a product",
  inputSchema: { type: "object", properties: { id: { type: "string", minLength: 1, description: "Shopify product GID" } }, required: ["id"] },
  execute: async (client, args) => {
    try {
      const q = gql`mutation productDelete($input:ProductDeleteInput!){productDelete(input:$input){deletedProductId userErrors{field message}}}`;
      const data = await client.request(q, { input: { id: args.id } });
      checkUserErrors(data.productDelete.userErrors, "delete product");
      return { deletedProductId: data.productDelete.deletedProductId };
    } catch (error) { handleToolError("delete product", error); }
  },
};
