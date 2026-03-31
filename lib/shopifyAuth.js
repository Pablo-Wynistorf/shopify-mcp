const { getToken, putToken } = require("./tokenStore");

/**
 * Get a valid Shopify access token via client_credentials flow.
 * Checks DynamoDB cache first; fetches from Shopify if missing/expired.
 */
async function getAccessToken(clientId, clientSecret, shopDomain) {
  // 1. Try cache
  const cached = await getToken(clientId, clientSecret, shopDomain);
  if (cached) return cached;

  // 2. Exchange credentials with Shopify
  const url = `https://${shopDomain}/admin/oauth/access_token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // 3. Cache in DynamoDB
  await putToken(
    clientId,
    clientSecret,
    shopDomain,
    data.access_token,
    data.expires_in
  );

  return data.access_token;
}

module.exports = { getAccessToken };
