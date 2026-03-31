const { gql, handleToolError, edgesToNodes } = require("../lib/helpers");

module.exports = {
  name: "get-product-variants-detailed",
  description: "Get all variant fields for a product: pricing, inventory, barcode, weight, tax code, selected options, metafields, and image",
  inputSchema: {
    type: "object",
    properties: {
      productId: { type: "string", minLength: 1, description: "The product ID (GID or just number)" },
      first: { type: "number", default: 50, minimum: 1, maximum: 100 },
    },
    required: ["productId"],
  },
  execute: async (client, args) => {
    try {
      const productId = args.productId.startsWith("gid://") ? args.productId : `gid://shopify/Product/${args.productId}`;
      const q = gql`query($id:ID!,$first:Int!){product(id:$id){id title variants(first:$first){edges{node{id title displayName sku barcode price compareAtPrice taxable availableForSale inventoryQuantity position createdAt updatedAt selectedOptions{name value} media(first:1){edges{node{...on MediaImage{image{url altText}}}}} inventoryItem{id tracked requiresShipping unitCost{amount currencyCode} measurement{weight{unit value}}} metafields(first:25){edges{node{namespace key value type}}}}}pageInfo{hasNextPage endCursor}}}}`;
      const data = await client.request(q, { id: productId, first: args.first || 50 });
      if (!data.product) throw new Error(`Product not found: ${productId}`);
      const variants = edgesToNodes(data.product.variants).map((v) => {
        const mediaNodes = v.media ? edgesToNodes(v.media) : [];
        const firstImage = mediaNodes.find((m) => m.image);
        const image = firstImage?.image ?? null;
        delete v.media;
        return { ...v, image, metafields: v.metafields ? edgesToNodes(v.metafields) : [] };
      });
      return { productId: data.product.id, productTitle: data.product.title, variantsCount: variants.length, variants, pageInfo: data.product.variants.pageInfo };
    } catch (error) { handleToolError("fetch product variants", error); }
  },
};
