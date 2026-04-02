const { gql } = require("graphql-request");

/**
 * Shared GraphQL query and response parser for ShopifyQL analytics tools.
 *
 * Schema (from Shopify docs):
 *   shopifyqlQuery(query: String!): ShopifyqlQueryResponse
 *     - parseErrors: String        (plain string, empty if no errors)
 *     - tableData: ShopifyqlTableData
 *         - columns: [ShopifyqlTableDataColumn!]!
 *             - name: String!
 *             - dataType: ColumnDataType!
 *             - displayName: String!
 *         - rows: [JSON!]!          (array of objects keyed by column name)
 */

const SHOPIFYQL_QUERY = gql`
  query ShopifyQL($query: String!) {
    shopifyqlQuery(query: $query) {
      parseErrors
      tableData {
        columns {
          name
          dataType
          displayName
        }
        rows
      }
    }
  }
`;

/**
 * Execute a ShopifyQL query and return parsed results.
 * @param {object} client - graphql-request client
 * @param {string} shopifyql - the ShopifyQL query string
 * @returns {{ rows: object[], columns: object[], queryUsed: string }}
 */
async function executeShopifyQL(client, shopifyql) {
  const data = await client.request(SHOPIFYQL_QUERY, { query: shopifyql });
  const response = data.shopifyqlQuery;

  if (response.parseErrors) {
    return {
      error: "ShopifyQL parse error",
      details: response.parseErrors,
      queryUsed: shopifyql,
    };
  }

  const { columns, rows } = response.tableData;
  return { rows, columns, queryUsed: shopifyql };
}

module.exports = { executeShopifyQL };
