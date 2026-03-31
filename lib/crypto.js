const crypto = require("crypto");

/**
 * Hash client credentials into a deterministic key for DynamoDB lookups.
 * Uses SHA-256 so the raw credentials are never stored.
 */
function hashCredentials(clientId, clientSecret) {
  return crypto
    .createHash("sha256")
    .update(`${clientId}:${clientSecret}`)
    .digest("hex");
}

module.exports = { hashCredentials };
