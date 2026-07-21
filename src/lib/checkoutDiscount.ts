export type DiscountQuote = {
  registrationFinalPricePence: number;
  membershipFinalPricePence: number;
};

export type ValidatedDiscount = {
  code: string;
  quote: DiscountQuote;
};

type ResolveCheckoutDiscountCodeOptions = {
  normalizedDiscountCode: string;
  discountApplied: boolean;
  appliedDiscountCode: string | null;
  validateDiscountCode: (code: string) => Promise<ValidatedDiscount | null>;
};

export async function resolveCheckoutDiscountCode({
  normalizedDiscountCode,
  discountApplied,
  appliedDiscountCode,
  validateDiscountCode,
}: ResolveCheckoutDiscountCodeOptions): Promise<{
  checkoutDiscountCode?: string;
  validatedDiscount?: ValidatedDiscount;
  invalid: boolean;
}> {
  if (!normalizedDiscountCode) {
    return { invalid: false };
  }

  if (discountApplied && appliedDiscountCode) {
    return {
      checkoutDiscountCode: appliedDiscountCode,
      invalid: false,
    };
  }

  const validatedDiscount = await validateDiscountCode(normalizedDiscountCode);
  if (!validatedDiscount) {
    return { invalid: true };
  }

  return {
    checkoutDiscountCode: validatedDiscount.code,
    validatedDiscount,
    invalid: false,
  };
}
