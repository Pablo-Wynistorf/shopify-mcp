/**
 * Tool categories for the compact (token-optimized) MCP mode.
 *
 * Instead of exposing 40+ individual tools, we group them into a handful
 * of category tools.  The AI client sees ~6 tools instead of ~40, which
 * dramatically reduces input-token usage on every request.
 */

const categories = {
  "shopify-products": {
    description:
      "Manage Shopify products, variants, options, and inventory. " +
      "Actions: get-products, get-product-by-id, create-product, update-product, delete-product, " +
      "get-product-variants-detailed, manage-product-variants, delete-product-variants, manage-product-options, " +
      "get-inventory-items, get-inventory-levels, set-inventory-quantities",
    actions: [
      "get-products", "get-product-by-id", "create-product", "update-product", "delete-product",
      "get-product-variants-detailed", "manage-product-variants", "delete-product-variants", "manage-product-options",
      "get-inventory-items", "get-inventory-levels", "set-inventory-quantities",
    ],
  },
  "shopify-orders": {
    description:
      "Manage Shopify orders, draft orders, fulfillments, and refunds. " +
      "Actions: get-orders, get-order-by-id, update-order, order-cancel, order-close-open, order-mark-as-paid, " +
      "create-draft-order, complete-draft-order, create-fulfillment, get-fulfillment-orders, " +
      "create-refund, get-order-refund-details, get-order-transactions",
    actions: [
      "get-orders", "get-order-by-id", "update-order", "order-cancel", "order-close-open", "order-mark-as-paid",
      "create-draft-order", "complete-draft-order", "create-fulfillment", "get-fulfillment-orders",
      "create-refund", "get-order-refund-details", "get-order-transactions",
    ],
  },
  "shopify-customers": {
    description:
      "Manage Shopify customers, addresses, and merges. " +
      "Actions: get-customers, get-customer-by-id, create-customer, update-customer, delete-customer, " +
      "get-customer-orders, manage-customer-address, customer-merge",
    actions: [
      "get-customers", "get-customer-by-id", "create-customer", "update-customer", "delete-customer",
      "get-customer-orders", "manage-customer-address", "customer-merge",
    ],
  },
  "shopify-collections": {
    description:
      "Query Shopify collections. Actions: get-collections, get-collection-by-id",
    actions: ["get-collections", "get-collection-by-id"],
  },
  "shopify-shop": {
    description:
      "Shop info, locations, markets, price lists, metafields, and tags. " +
      "Actions: get-shop-info, get-locations, get-markets, get-price-lists, " +
      "get-metafield-definitions, get-metafields, set-metafields, delete-metafields, manage-tags",
    actions: [
      "get-shop-info", "get-locations", "get-markets", "get-price-lists",
      "get-metafield-definitions", "get-metafields", "set-metafields", "delete-metafields", "manage-tags",
    ],
  },
  "shopify-analytics": {
    description:
      "Store analytics and reporting powered by ShopifyQL. Best sellers, sales trends, " +
      "channel performance, geographic breakdowns, customer cohorts, session/traffic data, " +
      "and custom ShopifyQL queries. Requires read_reports scope. " +
      "Actions: get-best-sellers, get-sales-over-time, get-sales-by-channel, get-sales-by-location, " +
      "get-customer-analytics, get-session-analytics, run-shopifyql",
    actions: [
      "get-best-sellers", "get-sales-over-time", "get-sales-by-channel", "get-sales-by-location",
      "get-customer-analytics", "get-session-analytics", "run-shopifyql",
    ],
  },
};

module.exports = { categories };
