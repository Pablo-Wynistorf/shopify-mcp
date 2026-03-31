const { gql } = require("graphql-request");

function checkUserErrors(errors, operation) {
  if (errors && errors.length > 0) {
    throw new Error(
      `Failed to ${operation}: ${errors.map((e) => `${e.field}: ${e.message}`).join(", ")}`
    );
  }
}

function handleToolError(operation, error) {
  if (error instanceof Error && error.message.startsWith("Failed to ")) throw error;
  const msg = error instanceof Error ? error.message : String(error);
  throw new Error(`Failed to ${operation}: ${msg}`);
}

function edgesToNodes(conn) {
  return (conn.edges || []).map((e) => e.node);
}

function formatLineItems(lineItems) {
  return lineItems.edges.map((edge) => {
    const i = edge.node;
    return {
      id: i.id, title: i.title, quantity: i.quantity,
      originalTotal: i.originalTotalSet.shopMoney,
      variant: i.variant ? { id: i.variant.id, title: i.variant.title, sku: i.variant.sku } : null,
    };
  });
}

function formatOrderSummary(order) {
  return {
    id: order.id, name: order.name, createdAt: order.createdAt,
    financialStatus: order.displayFinancialStatus,
    fulfillmentStatus: order.displayFulfillmentStatus,
    totalPrice: order.totalPriceSet.shopMoney,
    subtotalPrice: order.subtotalPriceSet.shopMoney,
    totalShippingPrice: order.totalShippingPriceSet.shopMoney,
    totalTax: order.totalTaxSet.shopMoney,
    customer: order.customer ? {
      id: order.customer.id, firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      email: order.customer.defaultEmailAddress?.emailAddress || null,
    } : null,
    shippingAddress: order.shippingAddress,
    lineItems: formatLineItems(order.lineItems),
    tags: order.tags, note: order.note,
  };
}

module.exports = { gql, checkUserErrors, handleToolError, edgesToNodes, formatLineItems, formatOrderSummary };
