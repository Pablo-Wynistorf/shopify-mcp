const { gql, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "get-products",
  description: "Get all products or search by title",
  inputSchema: {
    type: "object",
    properties: {
      searchTitle: { type: "string", description: "Search by title (convenience filter, wraps in title:*...*). Use 'query' for advanced filtering." },
      limit: { type: "number", default: 10 },
      after: { type: "string", description: "Cursor for forward pagination" },
      before: { type: "string", description: "Cursor for backward pagination" },
      sortKey: { type: "string", enum: ["CREATED_AT","ID","INVENTORY_TOTAL","PRODUCT_TYPE","PUBLISHED_AT","RELEVANCE","TITLE","UPDATED_AT","VENDOR"], default: "CREATED_AT" },
      reverse: { type: "boolean", default: true, description: "Reverse the sort order (default: true, newest first)" },
      query: { type: "string", description: "Raw query string for advanced filtering (e.g. 'status:active vendor:Nike tag:sale')" },
    },
  },
  execute: async (client, args = {}) => {
    try {
      const { searchTitle, limit = 10, after, before, sortKey = "CREATED_AT", reverse = true, query: rawQuery } = args;
      const parts = [];
      if (searchTitle) parts.push(`title:*${searchTitle}*`);
      if (rawQuery) parts.push(rawQuery);
      const queryFilter = parts.join(" ") || undefined;
      const q = gql`query GetProducts($first:Int!,$query:String,$after:String,$before:String,$sortKey:ProductSortKeys,$reverse:Boolean){products(first:$first,query:$query,after:$after,before:$before,sortKey:$sortKey,reverse:$reverse){edges{node{id title description handle status createdAt updatedAt totalInventory priceRangeV2{minVariantPrice{amount currencyCode}maxVariantPrice{amount currencyCode}} media(first:1){edges{node{...on MediaImage{id image{url altText}}}}} variants(first:5){edges{node{id title price inventoryQuantity sku}}}}}pageInfo{hasNextPage hasPreviousPage startCursor endCursor}}}`;
      const data = await client.request(q, { first: limit, query: queryFilter, after, before, sortKey, reverse });
      const products = data.products.edges.map((e) => {
        const p = e.node;
        const firstMedia = p.media.edges.find((m) => m.node.image);
        return {
          id: p.id, title: p.title, description: p.description, handle: p.handle, status: p.status,
          createdAt: p.createdAt, updatedAt: p.updatedAt, totalInventory: p.totalInventory,
          priceRange: { minPrice: p.priceRangeV2.minVariantPrice, maxPrice: p.priceRangeV2.maxVariantPrice },
          imageUrl: firstMedia?.node.image?.url || null,
          variants: p.variants.edges.map((v) => v.node),
        };
      });
      return { products, pageInfo: data.products.pageInfo };
    } catch (error) { handleToolError("fetch products", error); }
  },
};
