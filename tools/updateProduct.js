const { gql, checkUserErrors, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "update-product",
  description: "Update an existing product's fields (title, description, status, tags, etc.)",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", minLength: 1, description: "Shopify product GID, e.g. gid://shopify/Product/123" },
      title: { type: "string" }, descriptionHtml: { type: "string" },
      handle: { type: "string", description: "URL slug for the product" },
      vendor: { type: "string" }, productType: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
      status: { type: "string", enum: ["ACTIVE", "DRAFT", "ARCHIVED"] },
      seo: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } } },
      metafields: { type: "array", items: { type: "object", properties: { id: { type: "string" }, namespace: { type: "string" }, key: { type: "string" }, value: { type: "string" }, type: { type: "string" } }, required: ["value"] } },
      collectionsToJoin: { type: "array", items: { type: "string" }, description: "Collection GIDs to add the product to" },
      collectionsToLeave: { type: "array", items: { type: "string" }, description: "Collection GIDs to remove the product from" },
      redirectNewHandle: { type: "boolean", description: "If true, old handle redirects to new handle" },
    },
    required: ["id"],
  },
  execute: async (client, args) => {
    try {
      const { id, ...fields } = args;
      const q = gql`mutation productUpdate($product:ProductUpdateInput!){productUpdate(product:$product){product{id title handle descriptionHtml vendor productType status tags seo{title description} metafields(first:10){edges{node{id namespace key value}}} variants(first:20){edges{node{id title price sku selectedOptions{name value}}}}} userErrors{field message}}}`;
      const data = await client.request(q, { product: { id, ...fields } });
      checkUserErrors(data.productUpdate.userErrors, "update product");
      const p = data.productUpdate.product;
      return { product: { id: p.id, title: p.title, handle: p.handle, descriptionHtml: p.descriptionHtml, vendor: p.vendor, productType: p.productType, status: p.status, tags: p.tags, seo: p.seo, metafields: p.metafields?.edges.map((e) => e.node) || [], variants: p.variants?.edges.map((e) => ({ id: e.node.id, title: e.node.title, price: e.node.price, sku: e.node.sku, options: e.node.selectedOptions })) || [] } };
    } catch (error) { handleToolError("update product", error); }
  },
};
