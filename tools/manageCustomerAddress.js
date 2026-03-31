const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "manage-customer-address",
  description: "Create, update, or delete a customer's mailing address. Can optionally set as default.",
  inputSchema: {
    type: "object",
    properties: {
      customerId: { type: "string", description: "Customer GID" },
      action: { type: "string", enum: ["create", "update", "delete"] },
      addressId: { type: "string", description: "Address GID (required for update and delete)" },
      address: { type: "object", properties: { address1:{type:"string"},address2:{type:"string"},city:{type:"string"},company:{type:"string"},countryCode:{type:"string"},firstName:{type:"string"},lastName:{type:"string"},phone:{type:"string"},provinceCode:{type:"string"},zip:{type:"string"} }, description: "Address fields (required for create and update)" },
      setAsDefault: { type: "boolean" },
    },
    required: ["customerId", "action"],
  },
  execute: async (client, args) => {
    try {
      if (args.action === "create") {
        if (!args.address) throw new Error("Address fields are required for create action");
        const q = gql`mutation customerAddressCreate($customerId:ID!,$address:MailingAddressInput!,$setAsDefault:Boolean){customerAddressCreate(customerId:$customerId,address:$address,setAsDefault:$setAsDefault){address{id address1 address2 city company countryCodeV2 firstName lastName phone provinceCode zip} userErrors{field message}}}`;
        const data = await client.request(q, { customerId: args.customerId, address: args.address, setAsDefault: args.setAsDefault });
        checkUserErrors(data.customerAddressCreate.userErrors, "create address");
        return { address: data.customerAddressCreate.address };
      } else if (args.action === "update") {
        if (!args.addressId) throw new Error("addressId is required for update action");
        if (!args.address) throw new Error("Address fields are required for update action");
        const q = gql`mutation customerAddressUpdate($customerId:ID!,$addressId:ID!,$address:MailingAddressInput!,$setAsDefault:Boolean){customerAddressUpdate(customerId:$customerId,addressId:$addressId,address:$address,setAsDefault:$setAsDefault){address{id address1 address2 city company countryCodeV2 firstName lastName phone provinceCode zip} userErrors{field message}}}`;
        const data = await client.request(q, { customerId: args.customerId, addressId: args.addressId, address: args.address, setAsDefault: args.setAsDefault });
        checkUserErrors(data.customerAddressUpdate.userErrors, "update address");
        return { address: data.customerAddressUpdate.address };
      } else {
        if (!args.addressId) throw new Error("addressId is required for delete action");
        const q = gql`mutation customerAddressDelete($customerId:ID!,$addressId:ID!){customerAddressDelete(customerId:$customerId,addressId:$addressId){deletedAddressId userErrors{field message}}}`;
        const data = await client.request(q, { customerId: args.customerId, addressId: args.addressId });
        checkUserErrors(data.customerAddressDelete.userErrors, "delete address");
        return { deletedAddressId: data.customerAddressDelete.deletedAddressId };
      }
    } catch (error) { handleToolError(`${args.action} customer address`, error); }
  },
};
