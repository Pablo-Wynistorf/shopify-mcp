const { gql, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "get-metafields",
  description: "Get metafields for any Shopify resource (products, orders, customers, variants, collections, etc.).",
  inputSchema: {
    type: "object",
    properties: {
      ownerId: { type: "string", description: "GID of the resource" },
      namespace: { type: "string", description: "Filter metafields by namespace" },
      first: { type: "number", default: 25, description: "Number of metafields to return (max 50)" },
      after: { type: "string", description: "Cursor for pagination" },
    },
    required: ["ownerId"],
  },
  execute: async (client, args) => {
    try {
      const q = gql`query GetMetafields($ownerId:ID!,$first:Int!,$namespace:String,$after:String){node(id:$ownerId){...on HasMetafields{metafields(first:$first,namespace:$namespace,after:$after){edges{node{id namespace key value type updatedAt}}pageInfo{hasNextPage endCursor}}}}}`;
      const data = await client.request(q, { ownerId: args.ownerId, first: args.first || 25, ...(args.namespace && { namespace: args.namespace }), ...(args.after && { after: args.after }) });
      if (!data.node) throw new Error(`Resource ${args.ownerId} not found`);
      if (!data.node.metafields) throw new Error(`Resource ${args.ownerId} does not support metafields`);
      return { metafields: data.node.metafields.edges.map((e) => e.node), pageInfo: data.node.metafields.pageInfo };
    } catch (error) { handleToolError("fetch metafields", error); }
  },
};
