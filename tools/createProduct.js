const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "create-product",
  description: "Create a new product. When using productOptions, Shopify registers all option values but only creates one default variant. Use manage-product-variants afterward to create all real variants with prices.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", minLength: 1 },
      descriptionHtml: { type: "string" },
      handle: { type: "string", description: "URL slug, e.g. 'black-sunglasses'. Auto-generated from title if omitted." },
      vendor: { type: "string" },
      productType: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
      status: { type: "string", enum: ["ACTIVE", "DRAFT", "ARCHIVED"], default: "DRAFT" },
      seo: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, description: "SEO title and description" },
      metafields: { type: "array", items: { type: "object", properties: { namespace: { type: "string" }, key: { type: "string" }, value: { type: "string" }, type: { type: "string" } }, required: ["namespace", "key", "value", "type"] } },
      productOptions: { type: "array", items: { type: "object", properties: { name: { type: "string" }, values: { type: "array", items: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } } }, required: ["name"] }, description: "Product options (max 3)" },
      collectionsToJoin: { type: "array", items: { type: "string" }, description: "Collection GIDs to add the product to" },
    },
    required: ["title"],
  },
  execute: async (client, args) => {
    try {
      const q = gql`mutation productCreate($product:ProductCreateInput!){productCreate(product:$product){product{id title handle descriptionHtml vendor productType status tags seo{title description} options{id name values} metafields(first:10){edges{node{id namespace key value}}}} userErrors{field message}}}`;
      const data = await client.request(q, { product: args });
      checkUserErrors(data.productCreate.userErrors, "create product");
      const p = data.productCreate.product;
      return { product: { id: p.id, title: p.title, handle: p.handle, descriptionHtml: p.descriptionHtml, vendor: p.vendor, productType: p.productType, status: p.status, tags: p.tags, seo: p.seo, options: p.options, metafields: p.metafields?.edges.map((e) => e.node) || [] } };
    } catch (error) { handleToolError("create product", error); }
  },
};
