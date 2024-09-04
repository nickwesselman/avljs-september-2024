import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { AdminApiContext, Session } from "@shopify/shopify-app-remix/server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);
  console.log("Webhook received", topic, JSON.stringify(payload, null, 2));

  if (!admin && topic !== 'SHOP_REDACT') {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    // The SHOP_REDACT webhook will be fired up to 48 hours after a shop uninstalls the app.
    // Because of this, no admin context is available.
    throw new Response();
  }

  // The topics handled here should be declared in the shopify.app.toml.
  // More info: https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration
  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      }

      break;
    case "ORDERS_CREATE":
      if (admin) {
        await tagCustomerIfTheyBoughtMembership(payload, admin);
      }
      break;
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};

async function tagCustomerIfTheyBoughtMembership(payload: Record<string, any>, admin: AdminApiContext) {
  if (!payload.line_items.find((lineItem: { sku: string; }) => lineItem.sku === 'MEMBERSHIP')) {
    console.log("No membership product found in order");
    return;
  }

  const customerId = payload.customer.admin_graphql_api_id;
  console.log("Tagging customer as member:", customerId);

  const response = await admin.graphql(`#graphql
    mutation addTags($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        node {
          id
        }
        userErrors {
          message
        }
      }
    }
  `, {
    variables: {
      id: customerId,
      tags: ["member"]
    }
  });
  const responseJson = await response.json();
  if (responseJson.data?.tagsAdd?.userErrors?.length) {
    console.error("Failed to tag customer as member", responseJson.data.addTags.userErrors);
  }
}