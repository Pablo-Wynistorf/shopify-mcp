const { gql } = require("graphql-request");

/**
 * Shared GraphQL query and response parser for ShopifyQL analytics tools.
 * All analytics tools use the shopifyqlQuery endpoint.
 */

const SHOPIFYQL_QUERY = gql`
  query ShopifyQL($query: String!) {
    shopifyqlQuery(query: $query) {
      __typename
      ... on TableResponse {
        tableData {
          columns {
            name
            dataType
            displayName
          }
          rowData
        }
      }
      ... on PolarisVizResponse {
        data {
          key
          data {
            key
            value
          }
        }
      }
      ... on ParseErrors {
        parseErrors {
          code
          message
          range {
            start { line character }
            end { line character }
          }
        }
      }
    }
  }
`;

/**
 * Execute a ShopifyQL query and return parsed results.
 * @param {object} client - graphql-request client
 * @param {string} shopifyql - the ShopifyQL query string
 * @returns {{ rows: object[], columns: object[], queryUsed: string } | { error: string, details: any, queryUsed: string }}
 */
async function executeShopifyQL(client, shopifyql) {
  const data = await client.request(SHOPIFYQL_QUERY, { query: shopifyql });
  const response = data.shopifyqlQuery;

  if (response.__typename === "ParseErrors") {
    return {
      error: "ShopifyQL parse error",
      details: response.parseErrors,
      queryUsed: shopifyql,
    };
  }

  if (response.__typename === "TableResponse") {
    const { columns, rowData } = response.tableData;
    const rows = rowData.map((row) => {
      const parsed = JSON.parse(row);
      const obj = {};
      columns.forEach((col, i) => {
        obj[col.name] = parsed[i];
      });
      return obj;
    });
    return { rows, columns, queryUsed: shopifyql };
  }

  // PolarisVizResponse fallback
  return { rawResponse: response, queryUsed: shopifyql };
}

module.exports = { executeShopifyQL };
