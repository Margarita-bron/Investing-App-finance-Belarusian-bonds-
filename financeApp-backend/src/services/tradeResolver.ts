import cron from "node-cron";
import { pool } from "../db.ts";
import { getBinancePrice } from "./binanceService.ts";

export function startTradeResolver() {
  cron.schedule("*/10 * * * * *", async () => {
    let expiredTrades: any[] = [];
    try {
      const { rows } = await pool.query(`
        SELECT * FROM trades
        WHERE closes_at <= NOW()
        AND result IS NULL
      `);
      expiredTrades = rows;
    } catch (err) {
      console.error("Ошибка cron (запрос трейдов):", err);
      return;
    }

    for (const trade of expiredTrades) {
      try {
        const currentPrice = await getBinancePrice(trade.pair);

        const won =
          (trade.direction === "up" && currentPrice > trade.entry_price) ||
          (trade.direction === "down" && currentPrice < trade.entry_price);

        const result = won ? "win" : "lose";

        await pool.query(
          `UPDATE trades
           SET result = $1, exit_price = $2, end_time = $3
           WHERE id = $4`,
          [result, currentPrice, Date.now(), trade.id],
        );

        const leverage = Number(trade.leverage) || 1;
        const payout = parseFloat(trade.position_size) * leverage;

        if (won) {
          // Return stake + profit (stake already deducted at entry)
          await pool.query(
            `UPDATE users
             SET balance = balance + $1, gross_profit = gross_profit + $2
             WHERE id = $3`,
            [parseFloat(trade.position_size) + payout, payout, trade.user_id],
          );
        } else {
          await pool.query(
            `UPDATE users SET gross_lose = gross_lose + $1 WHERE id = $2`,
            [parseFloat(trade.position_size), trade.user_id],
          );
        }

        await updateAnalytics(trade.user_id, trade, won);
      } catch (err) {
        console.error(`Ошибка обработки трейда ${trade.id}:`, err);
      }
    }
  });

  console.log("Trade resolver запущен");
}

async function updateAnalytics(userId: string, trade: any, won: boolean) {
  await pool.query(
    `INSERT INTO trade_analytics (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId],
  );

  const { rows } = await pool.query(
    "SELECT * FROM trade_analytics WHERE user_id = $1",
    [userId],
  );
  const prev = rows[0];
  if (!prev) {
    console.error(`updateAnalytics: строка для пользователя ${userId} не найдена после INSERT`);
    return;
  }

  const leverage = Number(trade.leverage) || 1;
  const payout = parseFloat(trade.position_size) * leverage;

  const winsDelta = won ? 1 : 0;
  const lossesDelta = won ? 0 : 1;
  const totalProfitDelta = won ? payout : 0;
  const totalLossDelta = won ? 0 : parseFloat(trade.position_size);

  const pnl = won ? payout : -parseFloat(trade.position_size);

  // equity — накопленный P&L за всё время
  const newEquity = parseFloat(prev.equity) + pnl;

  // peak_equity — максимальное значение equity за всё время для расчёта просадки
  const newPeakEquity = Math.max(parseFloat(prev.peak_equity), newEquity);

  // max_drawdown — максимальная просадка за всё время
  const newMaxDrawdown = Math.max(
    parseFloat(prev.max_drawdown),
    newPeakEquity - newEquity,
  );

  const newWinStreak = won ? prev.current_win_streak + 1 : 0;
  const newLoseStreak = won ? 0 : prev.current_lose_streak + 1;

  // AFTER LOSS BEHAVIOUR
  const { rows: lastTradeRows } = await pool.query(
    `SELECT position_size, result FROM trades
     WHERE user_id = $1
       AND result IS NOT NULL
       AND id != $2
     ORDER BY end_time DESC
     LIMIT 1`,
    [userId, trade.id],
  );
  const prevTrade = lastTradeRows[0];

  let lossFollowedByTradeCountDelta = 0;
  let totalGrowthAfterLossDelta = 0;
  let growthUpSumDelta = 0; // сумма коэффициентов когда ставка выросла
  let growthUpCountDelta = 0; // количество раз когда ставка выросла
  let growthDownSumDelta = 0; // сумма коэффициентов когда ставка уменьшилась
  let growthDownCountDelta = 0; // количество раз когда ставка уменьшилась
  let positionChangeCountDelta = 0;
  let doubleAfterLossCountDelta = 0;

  // growthFactor для SQL — нужен для CASE WHEN
  // null означает "предыдущей ставки с проигрышем не было"
  let growthFactor: number | null = null;

  if (prevTrade && prevTrade.result === "lose") {
    // growthFactor — во сколько раз изменилась ставка после проигрыша
    // Пример: проиграл со ставкой 100, следующая 200 → growthFactor = 2
    // Пример: проиграл со ставкой 100, следующая 50  → growthFactor = 0.5
    // Пример: проиграл со ставкой 100, следующая 100 → growthFactor = 1 (не изменил)
    growthFactor =
      parseFloat(trade.position_size) / parseFloat(prevTrade.position_size);

    // loss_followed_by_trade_count — сколько раз после проигрыша юзер вообще сделал следующую ставку
    lossFollowedByTradeCountDelta = 1;

    // total_growth_after_loss — сумма всех growthFactor
    totalGrowthAfterLossDelta = growthFactor;

    // position_change_count_after_loss — сколько раз ставка ИЗМЕНИЛАСЬ
    if (growthFactor !== 1) {
      positionChangeCountDelta = 1;
    }

    if (growthFactor > 1) {
      growthUpSumDelta = growthFactor;
      growthUpCountDelta = 1;
    }

    if (growthFactor < 1) {
      growthDownSumDelta = growthFactor;
      growthDownCountDelta = 1;
    }

    if (growthFactor >= 2) {
      doubleAfterLossCountDelta = 1;
    }
  }

  // POSITION METRICS — метрики размера ставок
  const positionSize = parseFloat(trade.position_size);

  // fast_trades — ставки с очень коротким временем (меньше 60 секунд)
  // Признак импульсивного поведения
  const fastTradeDelta = trade.duration_seconds < 60 ? 1 : 0;

  // total_trade_duration — суммарное время всех ставок в секундах
  // Нужна для расчёта среднего: avg = total / total_trades
  const durationDelta = parseFloat(trade.duration_seconds);

  await pool.query(
    `UPDATE trade_analytics SET
      total_trades        = total_trades + 1,
      wins                = wins + $1,
      losses              = losses + $2,
      total_profit        = total_profit + $3,
      total_loss          = total_loss + $4,
 
      -- Equity и drawdown
      equity              = $5,
      peak_equity         = $6,
      max_drawdown        = $7,
 
      -- Стрики — GREATEST сохраняет рекорд автоматически
      current_win_streak  = $8,
      longest_win_streak  = GREATEST(longest_win_streak, $8),
      current_lose_streak = $9,
      longest_lose_streak = GREATEST(longest_lose_streak, $9),
 
      -- After Loss: простые счётчики — просто прибавляем дельту
      loss_followed_by_trade_count     = loss_followed_by_trade_count + $10,
      total_growth_after_loss          = total_growth_after_loss + $11,
      growth_up_sum                    = growth_up_sum + $12,
      growth_up_count                  = growth_up_count + $13,
      growth_down_sum                  = growth_down_sum + $14,
      growth_down_count                = growth_down_count + $15,
      position_change_count_after_loss = position_change_count_after_loss + $16,
      double_after_loss_count          = double_after_loss_count + $17,
 
      -- After Loss: max/min обновляем ТОЛЬКО если был growthFactor
      -- CASE WHEN $18 IS NOT NULL — growthFactor передан (предыдущая была lose)
      -- ELSE — оставляем старое значение без изменений
      max_growth_after_loss = CASE
        WHEN $18::DECIMAL IS NOT NULL THEN GREATEST(max_growth_after_loss, $18::DECIMAL)
        ELSE max_growth_after_loss
      END,
      min_growth_after_loss = CASE
        WHEN $18::DECIMAL IS NOT NULL THEN LEAST(min_growth_after_loss, $18::DECIMAL)
        ELSE min_growth_after_loss
      END,
 
      -- Position metrics
      total_position_size = total_position_size + $19,
 
      -- max — GREATEST само выберет большее
      max_position_size   = GREATEST(max_position_size, $19),
 
      -- min — NULL означает "ещё не было ставок"
      -- При первой ставке просто берём её размер
      -- При последующих — берём меньшее из двух
      min_position_size   = CASE
        WHEN min_position_size = 0 THEN $19
        ELSE LEAST(min_position_size, $19)
      END,
 
      total_trade_duration = total_trade_duration + $20,
      fast_trades          = fast_trades + $21,
 
      updated_at           = NOW()
 
    WHERE user_id = $22`,
    [
      winsDelta,
      lossesDelta,
      totalProfitDelta,
      totalLossDelta,
      newEquity,
      newPeakEquity,
      newMaxDrawdown,
      newWinStreak,
      newLoseStreak,
      lossFollowedByTradeCountDelta,
      totalGrowthAfterLossDelta,
      growthUpSumDelta,
      growthUpCountDelta,
      growthDownSumDelta,
      growthDownCountDelta,
      positionChangeCountDelta,
      doubleAfterLossCountDelta,
      growthFactor,
      positionSize,
      durationDelta,
      fastTradeDelta,
      userId,
    ],
  );
}
