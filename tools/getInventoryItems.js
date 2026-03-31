const { gql, handleToolError, edgesToNodes } = require("../lib/helpers");

module.exports = {
  name: "get-inventory-items",
  description: "Get inventory item details for all variants of a product including SKU, cost, tracked status, country of origin, and HS codes",
  inputSchema: { type: "object", properties: { productId: { type: "string", minLength: 1, description: "The product ID (GID or just number)" } }, required: ["productId"] },
  execute: async (client, args) => {
    try {
      const productId = args.productId.startsWith("gid://") ? args.productId : `gid://shopify/Product/${args.productId}`;
      const q = gql`query($id:ID!){product(id:$id){id title variants(first:100){edges{node{id title sku inventoryItem{id sku tracked requiresShipping unitCost{amount currencyCode} countryCodeOfOrigin provinceCodeOfOrigin harmonizedSystemCode measurement{weight{unit value}} locationsCount{count}}}}}}}`;
      const data = await client.request(q, { id: productId });
      if (!data.product) throw new Error(`Product not found: ${productId}`);
      const variants = edgesToNodes(data.product.variants).map((v) => ({ variantId: v.id, variantTitle: v.title, variantSku: v.sku, inventoryItem: v.inventoryItem }));
      return { productId: data.product.id, productTitle: data.product.title, variantsCount: variants.length, variants };
    } catch (error) { handleToolError("fetch inventory items", error); }
  },
};
