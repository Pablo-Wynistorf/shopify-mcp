const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "customer-merge",
  description: "Merge two customer records into one. Optionally override which fields to keep.",
  inputSchema: {
    type: "object",
    properties: {
      customerOneId: { type: "string", description: "GID of the first customer" },
      customerTwoId: { type: "string", description: "GID of the second customer" },
      overrideFields: { type: "object", properties: { customerIdOfFirstNameToKeep: { type: "string" }, customerIdOfLastNameToKeep: { type: "string" }, customerIdOfEmailToKeep: { type: "string" }, customerIdOfPhoneNumberToKeep: { type: "string" }, customerIdOfDefaultAddressToKeep: { type: "string" }, note: { type: "string" }, tags: { type: "array", items: { type: "string" } } } },
    },
    required: ["customerOneId", "customerTwoId"],
  },
  execute: async (client, args) => {
    try {
      const q = gql`mutation customerMerge($customerOneId:ID!,$customerTwoId:ID!,$overrideFields:CustomerMergeOverrideFields){customerMerge(customerOneId:$customerOneId,customerTwoId:$customerTwoId,overrideFields:$overrideFields){resultingCustomerId job{id done} userErrors{field message}}}`;
      const variables = { customerOneId: args.customerOneId, customerTwoId: args.customerTwoId };
      if (args.overrideFields) variables.overrideFields = args.overrideFields;
      const data = await client.request(q, variables);
      checkUserErrors(data.customerMerge.userErrors, "merge customers");
      return { resultingCustomerId: data.customerMerge.resultingCustomerId, job: data.customerMerge.job };
    } catch (error) { handleToolError("merge customers", error); }
  },
};
