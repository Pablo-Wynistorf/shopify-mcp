const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "set-metafields",
  description: "Set metafields on any Shopify resource. Creates or updates up to 25 metafields atomically.",
  inputSchema: {
    type: "object",
    properties: {
      metafields: { type: "array", minItems: 1, maxItems: 25, description: "Metafields to set (max 25).", items: { type: "object", properties: { ownerId: { type: "string" }, namespace: { type: "string" }, key: { type: "string" }, value: { type: "string" }, type: { type: "string" } }, required: ["ownerId","key","value"] } },
    },
    required: ["metafields"],
  },
  execute: async (client, args) => {
    try {
      const q = gql`mutation metafieldsSet($metafields:[MetafieldsSetInput!]!){metafieldsSet(metafields:$metafields){metafields{id namespace key value type ownerType} userErrors{field message code}}}`;
      const data = await client.request(q, { metafields: args.metafields });
      checkUserErrors(data.metafieldsSet.userErrors, "set metafields");
      return { metafields: data.metafieldsSet.metafields || [] };
    } catch (error) { handleToolError("set metafields", error); }
  },
};
