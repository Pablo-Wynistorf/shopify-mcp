const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "manage-tags",
  description: "Add or remove tags on any taggable resource (orders, products, customers, draft orders, articles).",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "GID of the resource" },
      tags: { type: "array", items: { type: "string" }, minItems: 1 },
      action: { type: "string", enum: ["add", "remove"] },
    },
    required: ["id", "tags", "action"],
  },
  execute: async (client, args) => {
    try {
      if (args.action === "add") {
        const q = gql`mutation tagsAdd($id:ID!,$tags:[String!]!){tagsAdd(id:$id,tags:$tags){node{id} userErrors{field message}}}`;
        const data = await client.request(q, { id: args.id, tags: args.tags });
        checkUserErrors(data.tagsAdd.userErrors, "add tags");
        return { id: data.tagsAdd.node?.id, action: "add", tags: args.tags };
      } else {
        const q = gql`mutation tagsRemove($id:ID!,$tags:[String!]!){tagsRemove(id:$id,tags:$tags){node{id} userErrors{field message}}}`;
        const data = await client.request(q, { id: args.id, tags: args.tags });
        checkUserErrors(data.tagsRemove.userErrors, "remove tags");
        return { id: data.tagsRemove.node?.id, action: "remove", tags: args.tags };
      }
    } catch (error) { handleToolError(`${args.action} tags`, error); }
  },
};
