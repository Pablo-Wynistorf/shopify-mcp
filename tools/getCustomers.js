const { gql, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "get-customers",
  description: "Get customers or search by name/email",
  inputSchema: {
    type: "object",
    properties: {
      searchQuery: { type: "string", description: "Freetext search or Shopify query syntax (e.g. 'country:US tag:vip orders_count:>5')" },
      limit: { type: "number", default: 10 },
      after: { type: "string" }, before: { type: "string" },
      sortKey: { type: "string", enum: ["CREATED_AT","ID","LAST_UPDATE","LOCATION","NAME","ORDERS_COUNT","RELEVANCE","TOTAL_SPENT","UPDATED_AT"], default: "CREATED_AT" },
      reverse: { type: "boolean", default: true },
    },
  },
  execute: async (client, args = {}) => {
    try {
      const { searchQuery, limit = 10, after, before, sortKey = "CREATED_AT", reverse = true } = args;
      const q = gql`query($first:Int!,$query:String,$after:String,$before:String,$sortKey:CustomerSortKeys,$reverse:Boolean){customers(first:$first,query:$query,after:$after,before:$before,sortKey:$sortKey,reverse:$reverse){edges{node{id firstName lastName defaultEmailAddress{emailAddress} defaultPhoneNumber{phoneNumber} createdAt updatedAt tags defaultAddress{address1 address2 city provinceCode zip country phone} addressesV2(first:10){edges{node{address1 address2 city provinceCode zip country phone}}} amountSpent{amount currencyCode} numberOfOrders}}pageInfo{hasNextPage hasPreviousPage startCursor endCursor}}}`;
      const data = await client.request(q, { first: limit, query: searchQuery, after, before, sortKey, reverse });
      const customers = data.customers.edges.map((e) => {
        const c = e.node;
        return { id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.defaultEmailAddress?.emailAddress || null, phone: c.defaultPhoneNumber?.phoneNumber || null, createdAt: c.createdAt, updatedAt: c.updatedAt, tags: c.tags, defaultAddress: c.defaultAddress, addresses: c.addressesV2 ? c.addressesV2.edges.map((a) => a.node) : [], amountSpent: c.amountSpent, numberOfOrders: c.numberOfOrders };
      });
      return { customers, pageInfo: data.customers.pageInfo };
    } catch (error) { handleToolError("fetch customers", error); }
  },
};
