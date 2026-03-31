const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "delete-metafields",
  description: "Delete metafields from any Shopify resource by specifying owner ID, namespace, and key.",
  inputSchema: {
    type: "object",
    properties: {
      metafields: { type: "array", minItems: 1, items: { type: "object", properties: { ownerId: { type: "string" }, namespace: { type: "string" }, key: { type: "string" } }, required: ["ownerId","namespace","key"] } },
    },
    required: ["metafields"],
  },
  execute: async (client, args) => {
    try {
      const q = gql`mutation metafieldsDelete($metafields:[MetafieldIdentifierInput!]!){metafieldsDelete(metafields:$metafields){deletedMetafields{ownerId namespace key} userErrors{field message}}}`;
      const data = await client.request(q, { metafields: args.metafields });
      checkUserErrors(data.metafieldsDelete.userErrors, "delete metafields");
      return { deletedMetafields: data.metafieldsDelete.deletedMetafields || [] };
    } catch (error) { handleToolError("delete metafields", error); }
  },
};
