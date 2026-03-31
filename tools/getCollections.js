const { gql, handleToolError, edgesToNodes } = require("../lib/helpers");

module.exports = {
  name: "get-collections",
  description: "Query collections (manual & smart) with optional filtering.",
  inputSchema: {
    type: "object",
    properties: {
      first: { type: "number", default: 25, minimum: 1, maximum: 100 },
      query: { type: "string", description: "Search query to filter collections" },
    },
  },
  execute: async (client, args = {}) => {
    try {
      const q = gql`query GetCollections($first:Int!,$query:String){collections(first:$first,query:$query){edges{node{id title handle description sortOrder productsCount{count} templateSuffix updatedAt ruleSet{appliedDisjunctively rules{column relation condition}} image{url altText} seo{title description}}}pageInfo{hasNextPage endCursor}}}`;
      const variables = { first: args.first || 25 };
      if (args.query) variables.query = args.query;
      const data = await client.request(q, variables);
      const collections = edgesToNodes(data.collections);
      return { collectionsCount: collections.length, collections, pageInfo: data.collections.pageInfo };
    } catch (error) { handleToolError("fetch collections", error); }
  },
};
