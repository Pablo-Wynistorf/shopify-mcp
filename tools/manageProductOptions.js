const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

const PRODUCT_OPTIONS_FRAGMENT = `fragment ProductOptionsFields on Product { id title options { id name position optionValues { id name hasVariants } } variants(first:20) { edges { node { id title price selectedOptions { name value } } } } }`;

function formatProductResponse(product) {
  return {
    product: {
      id: product.id, title: product.title,
      options: product.options.map((o) => ({ id: o.id, name: o.name, position: o.position, values: o.optionValues.map((v) => ({ id: v.id, name: v.name, hasVariants: v.hasVariants })) })),
      variants: product.variants.edges.map((e) => ({ id: e.node.id, title: e.node.title, price: e.node.price, options: e.node.selectedOptions })),
    },
  };
}

module.exports = {
  name: "manage-product-options",
  description: "Create, update, or delete product options (e.g. Size, Color).",
  inputSchema: {
    type: "object",
    properties: {
      productId: { type: "string", minLength: 1, description: "Shopify product GID" },
      action: { type: "string", enum: ["create", "update", "delete"] },
      variantStrategy: { type: "string", enum: ["LEAVE_AS_IS", "CREATE"], description: "Strategy for variant creation when adding options." },
      options: { type: "array", items: { type: "object", properties: { name: { type: "string" }, position: { type: "number" }, values: { type: "array", items: { type: "string" } } }, required: ["name"] }, description: "Options to create (action=create)" },
      optionId: { type: "string", description: "Option GID to update (action=update)" },
      name: { type: "string", description: "New name for the option (action=update)" },
      position: { type: "number", description: "New position (action=update)" },
      valuesToAdd: { type: "array", items: { type: "string" }, description: "Values to add (action=update)" },
      valuesToDelete: { type: "array", items: { type: "string" }, description: "Value GIDs to delete (action=update)" },
      optionIds: { type: "array", items: { type: "string" }, description: "Option GIDs to delete (action=delete)" },
    },
    required: ["productId", "action"],
  },
  execute: async (client, args) => {
    try {
      const { productId, action } = args;

      if (action === "create") {
        if (!args.options?.length) throw new Error("options array is required for action=create");
        const q = gql`mutation productOptionsCreate($productId:ID!,$options:[OptionCreateInput!]!,$variantStrategy:ProductOptionCreateVariantStrategy){productOptionsCreate(productId:$productId,options:$options,variantStrategy:$variantStrategy){product{...ProductOptionsFields} userErrors{field message code}}} ${PRODUCT_OPTIONS_FRAGMENT}`;
        const options = args.options.map((o) => ({ name: o.name, ...(o.position !== undefined && { position: o.position }), ...(o.values && { values: o.values.map((v) => ({ name: v })) }) }));
        const data = await client.request(q, { productId, options, variantStrategy: args.variantStrategy || "LEAVE_AS_IS" });
        checkUserErrors(data.productOptionsCreate.userErrors, "create options");
        return formatProductResponse(data.productOptionsCreate.product);
      }

      if (action === "update") {
        if (!args.optionId) throw new Error("optionId is required for action=update");
        const q = gql`mutation productOptionUpdate($productId:ID!,$option:OptionUpdateInput!,$optionValuesToAdd:[OptionValueCreateInput!],$optionValuesToDelete:[ID!]){productOptionUpdate(productId:$productId,option:$option,optionValuesToAdd:$optionValuesToAdd,optionValuesToDelete:$optionValuesToDelete){product{...ProductOptionsFields} userErrors{field message code}}} ${PRODUCT_OPTIONS_FRAGMENT}`;
        const option = { id: args.optionId };
        if (args.name) option.name = args.name;
        if (args.position !== undefined) option.position = args.position;
        const variables = { productId, option };
        if (args.valuesToAdd?.length) variables.optionValuesToAdd = args.valuesToAdd.map((v) => ({ name: v }));
        if (args.valuesToDelete?.length) variables.optionValuesToDelete = args.valuesToDelete;
        const data = await client.request(q, variables);
        checkUserErrors(data.productOptionUpdate.userErrors, "update option");
        return formatProductResponse(data.productOptionUpdate.product);
      }

      if (action === "delete") {
        if (!args.optionIds?.length) throw new Error("optionIds array is required for action=delete");
        const q = gql`mutation productOptionsDelete($productId:ID!,$options:[ID!]!){productOptionsDelete(productId:$productId,options:$options){product{...ProductOptionsFields} userErrors{field message code}}} ${PRODUCT_OPTIONS_FRAGMENT}`;
        const data = await client.request(q, { productId, options: args.optionIds });
        checkUserErrors(data.productOptionsDelete.userErrors, "delete options");
        return formatProductResponse(data.productOptionsDelete.product);
      }

      throw new Error(`Unknown action: ${action}`);
    } catch (error) { handleToolError("manage product options", error); }
  },
};
