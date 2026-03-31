const { gql, handleToolError, edgesToNodes } = require("../lib/helpers");

module.exports = {
  name: "get-metafield-definitions",
  description: "Discover custom metafield definitions for any resource type (PRODUCT, ORDER, CUSTOMER, etc.).",
  inputSchema: {
    type: "object",
    properties: {
      ownerType: { type: "string", enum: ["ARTICLE","BLOG","COLLECTION","CUSTOMER","COMPANY","COMPANY_LOCATION","DELIVERY_CUSTOMIZATION","DISCOUNT","DRAFTORDER","LOCATION","MARKET","ORDER","PAGE","PRODUCT","PRODUCTVARIANT","SHOP"] },
      first: { type: "number", default: 50, minimum: 1, maximum: 100 },
    },
    required: ["ownerType"],
  },
  execute: async (client, args) => {
    try {
      const q = gql`query GetMetafieldDefinitions($ownerType:MetafieldOwnerType!,$first:Int!){metafieldDefinitions(ownerType:$ownerType,first:$first){edges{node{id namespace key name description ownerType pinnedPosition type{name category} validations{name type value}}}}}`;
      const data = await client.request(q, { ownerType: args.ownerType, first: args.first || 50 });
      const definitions = edgesToNodes(data.metafieldDefinitions);
      return { ownerType: args.ownerType, definitionsCount: definitions.length, definitions };
    } catch (error) { handleToolError("fetch metafield definitions", error); }
  },
};
