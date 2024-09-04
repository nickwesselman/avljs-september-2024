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

  if (input.cart.buyerIdentity?.customer?.isMember) {
    return noErrors;
  }

  for (const line of input.cart.lines) {
    if (line.merchandise.__typename === "ProductVariant" &&
      line.merchandise.product.isMemberOnly
    ) {
      return {
        errors: [
          {
            localizedMessage: `You must be a member to purchase ${line.merchandise.product.title}`,
            target: "cart",
          },
        ],
      };
    }
  }

  return noErrors;
};