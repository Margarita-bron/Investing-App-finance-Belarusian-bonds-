// ============================================================
// РАСЧЁТЫ — финансовые метрики облигаций
// ============================================================

import type { RawBond } from "../types/bonds";
import type { MacroData } from "./macroService";

/**
 * Лет до погашения от сегодняшней даты
 */
export function calcYearsToMaturity(maturityDate: string): number {
  const now = new Date();
  const maturity = new Date(maturityDate);
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  return Math.max(0, (maturity.getTime() - now.getTime()) / msPerYear);
}

/**
 * Текущая доходность = годовой купон / текущая цена
 * Показывает сколько % годовых ты получаешь на вложенную сумму прямо сейчас
 */
export function calcCurrentYield(bond: RawBond): number {
  const annualCoupon = (bond.couponRate / 100) * bond.nominalValue;
  return (annualCoupon / bond.currentPrice) * 100;
}

/**
 * YTM (Yield to Maturity) — доходность к погашению
 * Используем метод Ньютона для точного расчёта
 * Учитывает: купоны + разницу между ценой покупки и номиналом
 */
export function calcYTM(bond: RawBond): number {
  const yearsToMaturity = calcYearsToMaturity(bond.maturityDate);

  if (yearsToMaturity <= 0) return 0;

  const price = bond.currentPrice + (bond.accruedInterest ?? 0); // грязная цена
  const nominal = bond.nominalValue;
  const annualCoupon = (bond.couponRate / 100) * nominal;
  const paymentsPerYear = bond.couponFrequency;
  const couponPayment = annualCoupon / paymentsPerYear;
  const totalPeriods = Math.round(yearsToMaturity * paymentsPerYear);

  if (totalPeriods === 0) return calcCurrentYield(bond);

  // Функция расчёта цены по заданной ставке
  const priceAtRate = (rate: number): number => {
    const periodRate = rate / paymentsPerYear;
    let pv = 0;
    for (let t = 1; t <= totalPeriods; t++) {
      pv += couponPayment / Math.pow(1 + periodRate, t);
    }
    pv += nominal / Math.pow(1 + periodRate, totalPeriods);
    return pv;
  };

  // Метод Ньютона — итерационно ищем ставку
  let rate = annualCoupon / price; // начальное приближение
  for (let i = 0; i < 100; i++) {
    const f = priceAtRate(rate) - price;
    const df =
      (priceAtRate(rate + 0.0001) - priceAtRate(rate - 0.0001)) / 0.0002;
    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < 0.000001) break;
    rate = newRate;
  }

  return rate * 100;
}

/**
 * Дюрация Маколея — средневзвешенное время получения денег
 * Чем выше — тем сильнее цена реагирует на изменение ставок
 */
export function calcDuration(bond: RawBond): number {
  const yearsToMaturity = calcYearsToMaturity(bond.maturityDate);
  if (yearsToMaturity <= 0) return 0;

  const ytmDecimal = calcYTM(bond) / 100;
  const paymentsPerYear = bond.couponFrequency;
  const periodRate = ytmDecimal / paymentsPerYear;
  const annualCoupon = (bond.couponRate / 100) * bond.nominalValue;
  const couponPayment = annualCoupon / paymentsPerYear;
  const totalPeriods = Math.round(yearsToMaturity * paymentsPerYear);
  const price = bond.currentPrice;

  let weightedSum = 0;
  for (let t = 1; t <= totalPeriods; t++) {
    const timeInYears = t / paymentsPerYear;
    const pv = couponPayment / Math.pow(1 + periodRate, t);
    weightedSum += timeInYears * pv;
  }
  // последний платёж — номинал
  weightedSum +=
    yearsToMaturity *
    (bond.nominalValue / Math.pow(1 + periodRate, totalPeriods));

  return weightedSum / price;
}

/**
 * Модифицированная дюрация — на сколько % изменится цена
 * при изменении ставки на 1%
 */
export function calcModifiedDuration(bond: RawBond): number {
  const duration = calcDuration(bond);
  const ytm = calcYTM(bond) / 100;
  return duration / (1 + ytm / bond.couponFrequency);
}

/**
 * Полная доходность с учётом реинвестирования купонов
 */
export function calcTotalReturn(bond: RawBond): number {
  const yearsToMaturity = calcYearsToMaturity(bond.maturityDate);
  if (yearsToMaturity <= 0) return 0;

  const ytm = calcYTM(bond) / 100;
  const totalReturn = Math.pow(1 + ytm, yearsToMaturity) - 1;
  return totalReturn * 100;
}

/**
 * Реальная доходность с поправкой на инфляцию (формула Фишера)
 */
export function calcRealYield(ytm: number, inflationRate: number): number {
  const nominal = ytm / 100;
  const inflation = inflationRate / 100;
  return ((1 + nominal) / (1 + inflation) - 1) * 100;
}

/**
 * Спред к депозитной ставке — насколько облигация выгоднее депозита
 */
export function calcSpreadOverDeposit(
  ytm: number,
  avgDepositRate: number,
): number {
  return ytm - avgDepositRate;
}

/**
 * Индекс качества облигации (0–100).
 * Компоненты:
 *   30% — спред к депозиту      (выше = лучше)
 *   25% — обратная модиф. дюрация (ниже дюрация = безопаснее)
 *   20% — обратный срок до погашения (короче = консервативнее)
 *   25% — тип эмитента          (гос.=100, банк=60, корп.=30)
 */
export function calcQualityScore(bond: RawBond, macro: MacroData): number {
  const ytm = calcYTM(bond);
  const modDur = calcModifiedDuration(bond);
  const years = calcYearsToMaturity(bond.maturityDate);
  const spread = calcSpreadOverDeposit(ytm, macro.avgDepositRate);

  const spreadScore = Math.min(100, Math.max(0, (spread / 10) * 100));
  const durationScore = Math.min(100, Math.max(0, ((5 - modDur) / 5) * 100));
  const maturityScore = Math.min(100, Math.max(0, ((10 - years) / 10) * 100));
  const typeScore =
    bond.type === "government" ? 100 : bond.type === "banking" ? 60 : 30;

  return parseFloat(
    (
      spreadScore * 0.3 +
      durationScore * 0.25 +
      maturityScore * 0.2 +
      typeScore * 0.25
    ).toFixed(2),
  );
}

/**
 * Главная функция — рассчитывает все метрики сразу
 */
export function calcBondMetrics(bond: RawBond, macro: MacroData) {
  const ytm = calcYTM(bond);
  const duration = calcDuration(bond);
  const realYield = calcRealYield(ytm, macro.inflationRate);
  const spreadOverDeposit = calcSpreadOverDeposit(ytm, macro.avgDepositRate);

  return {
    currentYield: parseFloat(calcCurrentYield(bond).toFixed(2)),
    ytm: parseFloat(ytm.toFixed(2)),
    duration: parseFloat(duration.toFixed(2)),
    modifiedDuration: parseFloat(calcModifiedDuration(bond).toFixed(2)),
    yearsToMaturity: parseFloat(
      calcYearsToMaturity(bond.maturityDate).toFixed(2),
    ),
    totalReturn: parseFloat(calcTotalReturn(bond).toFixed(2)),
    realYield: parseFloat(realYield.toFixed(2)),
    spreadOverDeposit: parseFloat(spreadOverDeposit.toFixed(2)),
    qualityScore: calcQualityScore(bond, macro),
  };
}
