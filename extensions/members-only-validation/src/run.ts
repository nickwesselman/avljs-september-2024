import {
  type RunInput,
  type FunctionRunResult,
  BuyerJourneyStep,
} from "../generated/api";

export function run(input: RunInput): FunctionRunResult {
  const noErrors = {
    errors: [],
  };

  // Don't show errors in the cart
  if (input.buyerJourney.step === BuyerJourneyStep.CartInteraction) {
    return noErrors;
  }

  // If they are logged in and a member, they can purchase anything
  const isAuthenticated = input.cart.buyerIdentity?.isAuthenticated;
  if (isAuthenticated && input.cart.buyerIdentity?.customer?.isMember?.jsonValue) {
    return noErrors;
  }

  // Determine if the cart contains a members-only product or membership
  let membersOnlyProduct = null;
  let cartContainsMembership = false;
  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") {
      continue;
    }

    if (line.merchandise.product.isMemberOnly?.jsonValue) {
      membersOnlyProduct = line.merchandise.product;
    } else if (line.merchandise.sku === "MEMBERSHIP") {
      cartContainsMembership = true;
    }
  }

  // They need to log in
  if (membersOnlyProduct && !isAuthenticated) {
    return {
      errors: [
        {
          localizedMessage: `You must be a logged-in member to purchase ${membersOnlyProduct.title}. Please log in to validate your membership.`,
          target: "$.cart",
        },
      ],
    };
  }

  // They need to purchase a membership
  if (membersOnlyProduct && !cartContainsMembership) {
    return {
      errors: [
        {
          localizedMessage: `You must be a member to purchase ${membersOnlyProduct.title}. Please purchase a membership.`,
          target: "$.cart",
        },
      ],
    };
  }

  return noErrors;
};