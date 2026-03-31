const { gql, handleToolError } = require("../lib/helpers");

module.exports = {
  name: "get-shop-info",
  description: "Get shop configuration including name, plan, currencies, features, payment settings, tax config, and contact info",
  inputSchema: { type: "object", properties: {} },
  execute: async (client) => {
    try {
      const q = gql`query { shop { id name email contactEmail myshopifyDomain primaryDomain { url host } plan { publicDisplayName partnerDevelopment shopifyPlus } currencyCode enabledPresentmentCurrencies ianaTimezone timezoneAbbreviation taxShipping taxesIncluded setupRequired features { giftCards reports storefront harmonizedSystemCode avalaraAvatax sellsSubscriptions } paymentSettings { supportedDigitalWallets } shopAddress { address1 address2 city province provinceCode country countryCodeV2 zip phone } } }`;
      const data = await client.request(q);
      return { shop: data.shop };
    } catch (error) { handleToolError("fetch shop info", error); }
  },
};
