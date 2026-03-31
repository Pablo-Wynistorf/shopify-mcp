const { gql, handleToolError, edgesToNodes } = require("../lib/helpers");

module.exports = {
  name: "get-inventory-levels",
  description: "Get inventory quantities per location for an inventory item (available, on_hand, committed, reserved, incoming, damaged, etc.)",
  inputSchema: { type: "object", properties: { inventoryItemId: { type: "string", minLength: 1, description: "The inventory item ID (GID or just number)" } }, required: ["inventoryItemId"] },
  execute: async (client, args) => {
    try {
      const id = args.inventoryItemId.startsWith("gid://") ? args.inventoryItemId : `gid://shopify/InventoryItem/${args.inventoryItemId}`;
      const q = gql`query($id:ID!){inventoryItem(id:$id){id sku tracked inventoryLevels(first:50){edges{node{id location{id name isActive} quantities(names:["available","on_hand","committed","reserved","incoming","damaged","quality_control","safety_stock"]){name quantity} updatedAt}}}}}`;
      const data = await client.request(q, { id });
      if (!data.inventoryItem) throw new Error(`Inventory item not found: ${id}`);
      const levels = edgesToNodes(data.inventoryItem.inventoryLevels);
      return { inventoryItemId: data.inventoryItem.id, sku: data.inventoryItem.sku, tracked: data.inventoryItem.tracked, levelsCount: levels.length, levels };
    } catch (error) { handleToolError("fetch inventory levels", error); }
  },
};
