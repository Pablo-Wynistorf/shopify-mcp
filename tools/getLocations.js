const { gql, handleToolError, edgesToNodes } = require("../lib/helpers");

module.exports = {
  name: "get-locations",
  description: "Get all inventory/fulfillment locations with addresses, capabilities, and active status",
  inputSchema: {
    type: "object",
    properties: {
      includeInactive: { type: "boolean", default: false },
      first: { type: "number", default: 50, minimum: 1, maximum: 100 },
    },
  },
  execute: async (client, args = {}) => {
    try {
      const q = gql`query GetLocations($first:Int!,$includeInactive:Boolean!){locations(first:$first,includeInactive:$includeInactive){edges{node{id name isActive isFulfillmentService fulfillsOnlineOrders shipsInventory hasActiveInventory hasUnfulfilledOrders address{address1 address2 city province provinceCode country countryCode zip phone latitude longitude} fulfillmentService{serviceName handle} localPickupSettingsV2{instructions pickupTime}}}}}`;
      const data = await client.request(q, { first: args.first || 50, includeInactive: args.includeInactive || false });
      const locations = edgesToNodes(data.locations);
      return { locationsCount: locations.length, locations };
    } catch (error) { handleToolError("fetch locations", error); }
  },
};
