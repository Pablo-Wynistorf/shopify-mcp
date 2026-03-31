const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "create-draft-order",
  description: "Create a draft order for phone/chat sales, invoicing, or wholesale. Supports custom line items, discounts, and customer association.",
  inputSchema: {
    type: "object",
    properties: {
      lineItems: { type: "array", minItems: 1, description: "Line items (max 499). Use variantId for existing products or title+price for custom items.", items: { type: "object", properties: { variantId: { type: "string" }, title: { type: "string" }, quantity: { type: "number" }, originalUnitPriceWithCurrency: { type: "object", properties: { amount: { type: "string" }, currencyCode: { type: "string" } }, required: ["amount","currencyCode"] }, sku: { type: "string" }, taxable: { type: "boolean" }, requiresShipping: { type: "boolean" } }, required: ["quantity"] } },
      customerId: { type: "string", description: "Customer GID" },
      email: { type: "string" }, phone: { type: "string" }, note: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
      shippingAddress: { type: "object", properties: { address1:{type:"string"},address2:{type:"string"},city:{type:"string"},company:{type:"string"},countryCode:{type:"string"},firstName:{type:"string"},lastName:{type:"string"},phone:{type:"string"},provinceCode:{type:"string"},zip:{type:"string"} } },
      billingAddress: { type: "object", properties: { address1:{type:"string"},address2:{type:"string"},city:{type:"string"},company:{type:"string"},countryCode:{type:"string"},firstName:{type:"string"},lastName:{type:"string"},phone:{type:"string"},provinceCode:{type:"string"},zip:{type:"string"} } },
      useCustomerDefaultAddress: { type: "boolean" }, taxExempt: { type: "boolean" }, poNumber: { type: "string" },
      appliedDiscount: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, value: { type: "number" }, valueType: { type: "string", enum: ["FIXED_AMOUNT","PERCENTAGE"] } }, required: ["value","valueType"], description: "Order-level discount" },
    },
    required: ["lineItems"],
  },
  execute: async (client, args) => {
    try {
      const q = gql`mutation draftOrderCreate($input:DraftOrderInput!){draftOrderCreate(input:$input){draftOrder{id name status totalPriceSet{shopMoney{amount currencyCode}} subtotalPriceSet{shopMoney{amount currencyCode}} customer{id firstName lastName} lineItems(first:20){edges{node{id title quantity originalTotalSet{shopMoney{amount currencyCode}}}}} tags note2 createdAt} userErrors{field message}}}`;
      const draftInput = { lineItems: args.lineItems };
      if (args.customerId) draftInput.purchasingEntity = { customerId: args.customerId };
      if (args.email) draftInput.email = args.email;
      if (args.phone) draftInput.phone = args.phone;
      if (args.note) draftInput.note = args.note;
      if (args.tags) draftInput.tags = args.tags;
      if (args.shippingAddress) draftInput.shippingAddress = args.shippingAddress;
      if (args.billingAddress) draftInput.billingAddress = args.billingAddress;
      if (args.useCustomerDefaultAddress !== undefined) draftInput.useCustomerDefaultAddress = args.useCustomerDefaultAddress;
      if (args.taxExempt !== undefined) draftInput.taxExempt = args.taxExempt;
      if (args.poNumber) draftInput.poNumber = args.poNumber;
      if (args.appliedDiscount) draftInput.appliedDiscount = args.appliedDiscount;
      const data = await client.request(q, { input: draftInput });
      checkUserErrors(data.draftOrderCreate.userErrors, "create draft order");
      const d = data.draftOrderCreate.draftOrder;
      return { draftOrder: { id: d.id, name: d.name, status: d.status, totalPrice: d.totalPriceSet?.shopMoney, subtotalPrice: d.subtotalPriceSet?.shopMoney, customer: d.customer, lineItems: d.lineItems.edges.map((e) => ({ id: e.node.id, title: e.node.title, quantity: e.node.quantity, originalTotal: e.node.originalTotalSet?.shopMoney })), tags: d.tags, note: d.note2, createdAt: d.createdAt } };
    } catch (error) { handleToolError("create draft order", error); }
  },
};
