const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");
const { hashCredentials } = require("./crypto");

const TABLE_NAME = process.env.TOKEN_TABLE || "shopify-mcp-tokens";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Look up a cached Shopify access token.
 * Returns the token string or null if missing / expired.
 */
async function getToken(clientId, clientSecret, shopDomain) {
  const credHash = hashCredentials(clientId, clientSecret);
  const pk = `${credHash}#${shopDomain}`;

  const { Item } = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { pk } })
  );

  if (!Item) return null;

  // DynamoDB TTL is eventually consistent — double-check expiry ourselves.
  if (Item.expiresAt && Item.expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return Item.accessToken;
}

/**
 * Store a Shopify access token in DynamoDB with a TTL.
 * `expiresIn` is the number of seconds until the token expires (from Shopify).
 * We subtract 5 minutes as a safety margin.
 */
async function putToken(clientId, clientSecret, shopDomain, accessToken, expiresIn) {
  const credHash = hashCredentials(clientId, clientSecret);
  const pk = `${credHash}#${shopDomain}`;
  const ttl = Math.floor(Date.now() / 1000) + expiresIn - 300;

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk,
        accessToken,
        expiresAt: ttl,
        shopDomain,
        createdAt: new Date().toISOString(),
      },
    })
  );
}

module.exports = { getToken, putToken };
