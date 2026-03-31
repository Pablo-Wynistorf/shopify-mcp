const { GraphQLClient } = require("graphql-request");

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-01";

/**
 * Create a GraphQL client for the Shopify Admin API.
 */
function createShopifyClient(shopDomain, accessToken) {
  return new GraphQLClient(
    `https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`,
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    }
  );
}

module.exports = { createShopifyClient };
