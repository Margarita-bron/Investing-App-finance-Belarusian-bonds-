import type { RawBond } from "../types/bonds";

export function mapBond(apiBond: any): RawBond {
  return {
    id: apiBond.id,
    name: apiBond.name,
    issuer: apiBond.issuer,
    type: apiBond.type,

    currency: apiBond.currency,

    nominalValue: Number(apiBond.nominal_value),
    currentPrice: Number(apiBond.current_price),

    couponRate: Number(apiBond.coupon_rate),
    couponFrequency: Number(apiBond.coupon_frequency),

    maturityDate: apiBond.maturity_date,

    couponAmount: apiBond.coupon_amount ? Number(apiBond.coupon_amount) : undefined,
    nextCouponDate: apiBond.next_coupon_date,
    accruedInterest: apiBond.accrued_interest ? Number(apiBond.accrued_interest) : undefined,
  };
}
