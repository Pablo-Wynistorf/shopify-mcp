const { gql, handleToolError, edgesToNodes } = require("../lib/helpers");

module.exports = {
  name: "get-product-by-id",
  description: "Get a specific product by ID",
  inputSchema: { type: "object", properties: { productId: { type: "string", minLength: 1 } }, required: ["productId"] },
  execute: async (client, args) => {
    try {
      const q = gql`query($id:ID!){product(id:$id){id title description handle status createdAt updatedAt totalInventory priceRangeV2{minVariantPrice{amount currencyCode}maxVariantPrice{amount currencyCode}} media(first:5){edges{node{...on MediaImage{id image{url altText width height}}}}} variants(first:20){edges{node{id title price inventoryQuantity sku selectedOptions{name value}}}} collections(first:5){edges{node{id title}}} tags vendor productType descriptionHtml seo{title description} options{id name position optionValues{id name}}}}`;
      const data = await client.request(q, { id: args.productId });
      if (!data.product) throw new Error(`Product ${args.productId} not found`);
      const p = data.product;
      const images = p.media.edges.filter((e) => e.node.image).map((e) => ({ id: e.node.id, url: e.node.image.url, altText: e.node.image.altText, width: e.node.image.width, height: e.node.image.height }));
      return {
        product: {
          id: p.id, title: p.title, description: p.description, handle: p.handle, status: p.status,
          createdAt: p.createdAt, updatedAt: p.updatedAt, totalInventory: p.totalInventory,
          priceRange: { minPrice: p.priceRangeV2.minVariantPrice, maxPrice: p.priceRangeV2.maxVariantPrice },
          images, variants: p.variants.edges.map((e) => ({ ...e.node, options: e.node.selectedOptions })),
          collections: edgesToNodes(p.collections), tags: p.tags, vendor: p.vendor, productType: p.productType,
          descriptionHtml: p.descriptionHtml, seo: p.seo, options: p.options,
        },
      };
    } catch (error) { handleToolError("fetch product", error); }
  },
};
