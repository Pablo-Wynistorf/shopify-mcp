const { gql, handleToolError, edgesToNodes } = require("../lib/helpers");

module.exports = {
  name: "get-collection-by-id",
  description: "Get a single collection with full details including products, rules for smart collections, SEO, and image",
  inputSchema: {
    type: "object",
    properties: {
      collectionId: { type: "string", minLength: 1, description: "The collection ID (e.g. gid://shopify/Collection/123 or just 123)" },
      productsFirst: { type: "number", default: 25, minimum: 0, maximum: 100, description: "Number of products to include (0 to skip)" },
    },
    required: ["collectionId"],
  },
  execute: async (client, args) => {
    try {
      const collectionId = args.collectionId.startsWith("gid://") ? args.collectionId : `gid://shopify/Collection/${args.collectionId}`;
      const productsFirst = args.productsFirst ?? 25;
      const q = gql`query GetCollectionById($id:ID!,$productsFirst:Int!){collection(id:$id){id title handle descriptionHtml sortOrder templateSuffix updatedAt productsCount{count} ruleSet{appliedDisjunctively rules{column relation condition}} image{url altText width height} seo{title description} products(first:$productsFirst){edges{node{id title handle status vendor productType totalInventory featuredMedia{preview{image{url altText}}} priceRangeV2{minVariantPrice{amount currencyCode}maxVariantPrice{amount currencyCode}}}}pageInfo{hasNextPage endCursor}}}}`;
      const data = await client.request(q, { id: collectionId, productsFirst });
      if (!data.collection) throw new Error(`Collection not found: ${collectionId}`);
      return { collection: { ...data.collection, products: { items: edgesToNodes(data.collection.products), pageInfo: data.collection.products.pageInfo } } };
    } catch (error) { handleToolError("fetch collection", error); }
  },
};
