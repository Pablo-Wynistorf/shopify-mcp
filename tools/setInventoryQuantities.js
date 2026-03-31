const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "inventory-set-quantities",
  description: "Set absolute inventory quantities for items at specific locations.",
  inputSchema: {
    type: "object",
    properties: {
      reason: { type: "string", description: "Reason for the quantity change (e.g. 'correction', 'cycle_count_available', 'received')" },
      name: { type: "string", enum: ["available", "on_hand"] },
      quantities: { type: "array", minItems: 1, items: { type: "object", properties: { inventoryItemId: { type: "string" }, locationId: { type: "string" }, quantity: { type: "number" } }, required: ["inventoryItemId","locationId","quantity"] } },
      ignoreCompareQuantity: { type: "boolean", default: true },
    },
    required: ["reason", "name", "quantities"],
  },
  execute: async (client, args) => {
    try {
      const q = gql`mutation inventorySetQuantities($input:InventorySetQuantitiesInput!){inventorySetQuantities(input:$input){inventoryAdjustmentGroup{reason changes{name delta quantityAfterChange item{id sku} location{id name}}} userErrors{field message code}}}`;
      const data = await client.request(q, { input: { reason: args.reason, name: args.name, ignoreCompareQuantity: args.ignoreCompareQuantity !== false, quantities: args.quantities } });
      checkUserErrors(data.inventorySetQuantities.userErrors, "set inventory quantities");
      return { adjustmentGroup: data.inventorySetQuantities.inventoryAdjustmentGroup };
    } catch (error) { handleToolError("set inventory quantities", error); }
  },
};
