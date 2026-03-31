const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "manage-product-variants",
  description: "Create or update product variants. Omit variant id to create new, include id to update existing.",
  inputSchema: {
    type: "object",
    properties: {
      productId: { type: "string", minLength: 1, description: "Shopify product GID" },
      variants: { type: "array", minItems: 1, description: "Variants to create or update", items: { type: "object", properties: {
        id: { type: "string", description: "Variant GID for updates. Omit to create new." },
        price: { type: "string", description: "Price as string, e.g. '49.00'" },
        compareAtPrice: { type: "string", description: "Compare-at price for showing discounts" },
        sku: { type: "string", description: "SKU (mapped to inventoryItem.sku)" },
        tracked: { type: "boolean", description: "Whether inventory is tracked" },
        taxable: { type: "boolean" }, barcode: { type: "string" },
        weight: { type: "number" }, weightUnit: { type: "string", enum: ["GRAMS","KILOGRAMS","OUNCES","POUNDS"] },
        optionValues: { type: "array", items: { type: "object", properties: { optionName: { type: "string" }, name: { type: "string" } }, required: ["optionName","name"] } },
      } } },
      strategy: { type: "string", enum: ["DEFAULT","REMOVE_STANDALONE_VARIANT","PRESERVE_STANDALONE_VARIANT"], description: "Strategy for handling the standalone 'Default Title' variant when creating." },
    },
    required: ["productId", "variants"],
  },
  execute: async (client, args) => {
    try {
      const { productId, variants, strategy } = args;
      const toCreate = variants.filter((v) => !v.id);
      const toUpdate = variants.filter((v) => v.id);
      const results = { created: [], updated: [] };

      function buildVariant(v) {
        const variant = {};
        if (v.id) variant.id = v.id;
        if (v.price) variant.price = v.price;
        if (v.compareAtPrice) variant.compareAtPrice = v.compareAtPrice;
        if (v.barcode) variant.barcode = v.barcode;
        if (v.taxable !== undefined) variant.taxable = v.taxable;
        const inv = {};
        if (v.sku) inv.sku = v.sku;
        if (v.tracked !== undefined) inv.tracked = v.tracked;
        if (v.weight !== undefined) inv.measurement = { weight: { value: v.weight, unit: v.weightUnit || "GRAMS" } };
        if (Object.keys(inv).length) variant.inventoryItem = inv;
        if (v.optionValues) variant.optionValues = v.optionValues;
        return variant;
      }

      if (toCreate.length > 0) {
        const q = gql`mutation($productId:ID!,$variants:[ProductVariantsBulkInput!]!,$strategy:ProductVariantsBulkCreateStrategy){productVariantsBulkCreate(productId:$productId,variants:$variants,strategy:$strategy){productVariants{id title price sku selectedOptions{name value}} userErrors{field message}}}`;
        const data = await client.request(q, { productId, variants: toCreate.map(buildVariant), ...(strategy && { strategy }) });
        checkUserErrors(data.productVariantsBulkCreate.userErrors, "create variants");
        results.created = data.productVariantsBulkCreate.productVariants.map((v) => ({ id: v.id, title: v.title, price: v.price, sku: v.sku, options: v.selectedOptions }));
      }

      if (toUpdate.length > 0) {
        const q = gql`mutation($productId:ID!,$variants:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$productId,variants:$variants){productVariants{id title price sku selectedOptions{name value}} userErrors{field message}}}`;
        const data = await client.request(q, { productId, variants: toUpdate.map(buildVariant) });
        checkUserErrors(data.productVariantsBulkUpdate.userErrors, "update variants");
        results.updated = data.productVariantsBulkUpdate.productVariants.map((v) => ({ id: v.id, title: v.title, price: v.price, sku: v.sku, options: v.selectedOptions }));
      }

      return results;
    } catch (error) { handleToolError("manage product variants", error); }
  },
};
