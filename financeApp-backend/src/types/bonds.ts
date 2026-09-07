export type BondType = "government" | "corporate" | "banking";

export type RawBond = {
  id?: number;
  name: string;
  issuer: string;
  type: BondType;

  currency: "BYN" | "USD" | "EUR";
  nominalValue: number;
  currentPrice: number;

  couponRate: number;
  couponFrequency: number;

  maturityDate: string;
  couponAmount?: number;
  nextCouponDate?: string;
  accruedInterest?: number;
};
