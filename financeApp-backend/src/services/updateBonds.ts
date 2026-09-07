import axios from "axios";
import * as cheerio from "cheerio";
import { pool } from "../db.ts";
import type { BondType, RawBond } from "../types/bonds.ts";
import {
  calcYTM,
  calcDuration,
  calcModifiedDuration,
  calcYearsToMaturity,
  calcRealYield,
  calcSpreadOverDeposit,
  calcQualityScore,
} from "./bondMetrics.ts";
import { mapBond } from "../utils/mapBond.ts";
import { getLatestMacro } from "./macroService.ts";
import type { PoolClient } from "pg";

type ParseResult = {
  pages?: number;
  bonds: RawBond[];
};

function detectCurrency(text: string): "BYN" | "USD" | "EUR" {
  if (/USD/i.test(text)) return "USD";
  if (/EUR/i.test(text)) return "EUR";
  return "BYN";
}

function detectBondType(issuer: string): BondType {
  const s = issuer.toLowerCase();
  if (s.includes("министерство финансов")) return "government";
  if (s.includes("банк")) return "banking";
  return "corporate";
}

function parseDateDDMMYYYY(text: string): string | undefined {
  const m = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return undefined;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

async function parseSinglePage(
  url: string,
  findPages: boolean = false,
): Promise<ParseResult> {
  const bonds: RawBond[] = [];
  let pages: number | undefined;
  const { data } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    },
  });
  console.log(url);
  const $ = cheerio.load(data);
  console.log("Групп найдено:", $(".products__group").length);
  console.log("HTML фрагмент:", $.html().slice(0, 500));

  if (findPages) {
    const secondLast = $(".list-reset li a[data-page]")
      .slice(-2)
      .first()
      .attr("data-page");
    pages = secondLast ? parseInt(secondLast) + 1 : 9;
  }

  $(".products__group").each((_: any, group: any) => {
    const $group = $(group);

    const name = $group
      .find(".products__product-product-name a")
      .first()
      .text()
      .trim();
    const issuer = $group
      .find(".products__product-bank-name")
      .first()
      .text()
      .trim();
    const href = $group
      .find(".products__product-product-name a")
      .first()
      .attr("href");

    if (!name || !issuer) return;

  
    const nominalText = $group
      .find(".products__product-data--1 .products__product-not-accent")
      .first()
      .text()
      .trim();
    const nominalMatch = nominalText.match(/([\d\s]+)/);
    if (!nominalMatch) return;
    const nominalValue = parseFloat(nominalMatch[1].replace(/\s/g, ""));
    if (!nominalValue || isNaN(nominalValue)) return;

    const couponRateText = $group
      .find(".products__product-data--2 .products__product-accent")
      .first()
      .text()
      .trim();
    const couponRate = parseFloat(
      couponRateText.replace("%", "").replace(",", "."),
    );
    if (Number.isNaN(couponRate)) return;

    const nextCouponDateText = $group
      .find(".products__product-data--3 .products__product-accent > div")
      .first()
      .text()
      .trim();
    const nextCouponDate = parseDateDDMMYYYY(nextCouponDateText);

    const currency = detectCurrency(nominalText);
    const accentText = $group
      .find(".products__product-data--1 .products__product-accent")
      .first()
      .clone()
      .find(".products__product-not-accent")
      .remove()
      .end()
      .text()
      .trim();

    const priceMatch = accentText
      .replace(/нет сделок/gi, "")
      .match(/([\d\s.,]+)/);
    const currentPrice = priceMatch
      ? parseFloat(priceMatch[1].replace(/\s/g, "").replace(",", "."))
      : nominalValue;

    if (isNaN(currentPrice)) return;

    const couponAmountText = $group
      .find(".products__product-data--3 .products__product-not-accent")
      .first()
      .text()
      .trim(); 
    const couponAmount = (() => {
      const m = couponAmountText.match(/([\d\s.,]+)/);
      if (!m) return undefined;
      const v = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
      return Number.isNaN(v) ? undefined : v;
    })();

    // Погашение
    const maturityText = $group
      .find(".products__product-data--4 .products__product-not-accent")
      .first()
      .text()
      .trim(); 
    const maturityDate = parseDateDDMMYYYY(maturityText);
    if (!maturityDate) return;

    const type = detectBondType(issuer);

    const couponFrequency = type === "government" ? 2 : 12;

    const bond: RawBond = {
      name,
      issuer,
      type,
      currency,
      nominalValue,
      currentPrice,
      couponRate,
      couponFrequency,
      maturityDate,
      couponAmount,
      nextCouponDate,
    };

    bonds.push(bond);
  });
  return { pages, bonds };
}

export async function recalcAllBonds(client: PoolClient) {
  let macro = { month: "default", inflationRate: 5.4, avgDepositRate: 9.6 };
  try {
    macro = await getLatestMacro();
  } catch {
    console.warn("Макро-данные не найдены, используются значения по умолчанию");
  }

  const { rows } = await client.query(`SELECT * FROM bonds`);

  for (const bond of rows) {
    const mapped = mapBond(bond);
    const ytm = calcYTM(mapped);
    const duration = calcDuration(mapped);
    const modifiedDuration = calcModifiedDuration(mapped);
    const yearsToMaturity = calcYearsToMaturity(mapped.maturityDate);
    const realYield = calcRealYield(ytm, macro.inflationRate);
    const spreadOverDeposit = calcSpreadOverDeposit(ytm, macro.avgDepositRate);
    const qualityScore = calcQualityScore(mapped, macro);

    await client.query(
      `UPDATE bonds
       SET ytm = $1, duration = $2, modified_duration = $3,
           years_to_maturity = $4, real_yield = $5,
           spread_over_deposit = $6, quality_score = $7
       WHERE id = $8`,
      [
        ytm,
        duration,
        modifiedDuration,
        yearsToMaturity,
        realYield,
        spreadOverDeposit,
        qualityScore,
        bond.id,
      ],
    );
  }

  console.log("✅ Метрики облигаций обновлены");
}

export async function updateBonds() {
  const client = await pool.connect();
  try {
    let allBonds: RawBond[] = [];

    const result1 = await parseSinglePage(
      "https://myfin.by/obligatsii/all",
      true,
    );
    const totalPages = result1.pages || 9;
    allBonds = allBonds.concat(result1.bonds);

    console.log(`Всего страниц: ${totalPages}`);
    for (let page = 2; page <= Number(totalPages); page++) {
      const pageUrl = `https://myfin.by/obligatsii/all?page=${page}`;
      const pageResult = await parseSinglePage(pageUrl, false);
      console.log(
        `Страница ${page}: найдено ${pageResult.bonds.length} облигаций`,
      );
      allBonds = allBonds.concat(pageResult.bonds);
      await new Promise((r) => setTimeout(r, 500));
    }

    if (allBonds.length === 0) {
      console.warn("Парсер вернул 0 облигаций — БД не изменена");
      return;
    }

    await client.query("BEGIN");

    for (const bond of allBonds) {
      await client.query(
        `INSERT INTO bonds (
          name, issuer, type, currency,
          nominal_value, current_price,
          coupon_rate, coupon_frequency, maturity_date, coupon_amount, next_coupon_date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (name, issuer) DO UPDATE SET
          current_price     = EXCLUDED.current_price,
          coupon_rate       = EXCLUDED.coupon_rate,
          coupon_amount     = EXCLUDED.coupon_amount,
          next_coupon_date  = EXCLUDED.next_coupon_date,
          updated_at        = NOW()`,
        [
          bond.name,
          bond.issuer,
          bond.type,
          bond.currency,
          bond.nominalValue,
          bond.currentPrice,
          bond.couponRate,
          bond.couponFrequency,
          bond.maturityDate,
          bond.couponAmount ?? null,
          bond.nextCouponDate ?? null,
        ],
      );
      await client.query(
        `INSERT INTO companies (
          issuer_name
        ) VALUES ($1)
        ON CONFLICT (issuer_name) DO UPDATE SET
          updated_at        = NOW()`,
        [bond.issuer],
      );
    }

    await recalcAllBonds(client);

    await client.query("COMMIT");
    console.log(`💾 Сохранено в БД: ${allBonds.length} облигаций`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ Ошибка обновления, БД не изменена:", e);
  } finally {
    client.release();
  }
}
