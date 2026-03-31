const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "delete-product-variants",
  description: "Delete one or more variants from a product",
  inputSchema: {
    type: "object",
    properties: {
      productId: { type: "string", minLength: 1, description: "Shopify product GID" },
      variantIds: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1, description: "Array of variant GIDs to delete" },
    },
    required: ["productId", "variantIds"],
  },
  execute: async (client, args) => {
    try {
      const q = gql`mutation($productId:ID!,$variantsIds:[ID!]!){productVariantsBulkDelete(productId:$productId,variantsIds:$variantsIds){product{id title variants(first:20){edges{node{id title price sku selectedOptions{name value}}}}} userErrors{field message}}}`;
      const data = await client.request(q, { productId: args.productId, variantsIds: args.variantIds });
      checkUserErrors(data.productVariantsBulkDelete.userErrors, "delete variants");
      const p = data.productVariantsBulkDelete.product;
      return { product: { id: p.id, title: p.title, remainingVariants: p.variants.edges.map((e) => ({ id: e.node.id, title: e.node.title, price: e.node.price, sku: e.node.sku, options: e.node.selectedOptions })) } };
    } catch (error) { handleToolError("delete product variants", error); }
  },
};
