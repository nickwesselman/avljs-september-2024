import {
  type RunInput,
  type FunctionRunResult,
  BuyerJourneyStep,
} from "../generated/api";

export function run(input: RunInput): FunctionRunResult {
  const noErrors = {
    errors: [],
  };

  if (input.buyerJourney.step === BuyerJourneyStep.CartInteraction) {
    return noErrors;
  }

  if (input.cart.buyerIdentity?.isAuthenticated && input.cart.buyerIdentity?.customer?.isMember?.jsonValue) {
    return noErrors;
  }

  for (const line of input.cart.lines) {
    if (line.merchandise.__typename === "ProductVariant" && line.merchandise.product.isMemberOnly?.jsonValue
    ) {
      const message = input.cart.buyerIdentity?.isAuthenticated ?
        `You must be a member to purchase ${line.merchandise.product.title}. Please purchase a membership.` :
        `You must be a logged-in member to purchase ${line.merchandise.product.title}. Please log in to validate your membership.`;

      return {
        errors: [
          {
            localizedMessage: message,
            target: "$.cart",
          },
        ],
      };
    }
  }

  return noErrors;
};