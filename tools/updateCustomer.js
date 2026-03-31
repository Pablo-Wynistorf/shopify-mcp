const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "update-customer",
  description: "Update a customer's information",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", pattern: "^\\d+$" },
      firstName: { type: "string" }, lastName: { type: "string" },
      email: { type: "string", format: "email" }, phone: { type: "string" },
      tags: { type: "array", items: { type: "string" } }, note: { type: "string" },
      emailMarketingConsent: { type: "object", properties: { marketingState: { type: "string", enum: ["NOT_SUBSCRIBED","SUBSCRIBED","UNSUBSCRIBED","PENDING"] }, consentUpdatedAt: { type: "string" }, marketingOptInLevel: { type: "string", enum: ["SINGLE_OPT_IN","CONFIRMED_OPT_IN","UNKNOWN"] } }, required: ["marketingState"] },
      taxExempt: { type: "boolean" },
      metafields: { type: "array", items: { type: "object", properties: { id: { type: "string" }, namespace: { type: "string" }, key: { type: "string" }, value: { type: "string" }, type: { type: "string" } }, required: ["value"] } },
    },
    required: ["id"],
  },
  execute: async (client, args) => {
    try {
      const { id, ...fields } = args;
      const gid = `gid://shopify/Customer/${id}`;
      const q = gql`mutation customerUpdate($input:CustomerInput!){customerUpdate(input:$input){customer{id firstName lastName defaultEmailAddress{emailAddress} defaultPhoneNumber{phoneNumber} tags note taxExempt emailMarketingConsent{marketingState consentUpdatedAt marketingOptInLevel} metafields(first:10){edges{node{id namespace key value}}}} userErrors{field message}}}`;
      const data = await client.request(q, { input: { id: gid, ...fields } });
      checkUserErrors(data.customerUpdate.userErrors, "update customer");
      const c = data.customerUpdate.customer;
      return { customer: { id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.defaultEmailAddress?.emailAddress || null, phone: c.defaultPhoneNumber?.phoneNumber || null, tags: c.tags, note: c.note, taxExempt: c.taxExempt, emailMarketingConsent: c.emailMarketingConsent, metafields: c.metafields?.edges.map((e) => e.node) || [] } };
    } catch (error) { handleToolError("update customer", error); }
  },
};
