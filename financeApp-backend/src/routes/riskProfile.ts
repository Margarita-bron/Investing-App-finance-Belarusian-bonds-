import { Router } from "express";
import { pool } from "../db.ts";
import { getFirestore } from "../firebase/firebase.ts";
import type { AuthRequest } from "../middleware/auth.ts";

const router = Router();

async function recalcComposite(userId: string) {
  const { rows } = await pool.query(
    "SELECT * FROM risk_profiles WHERE user_id = $1",
    [userId],
  );
  const rp = rows[0];
  if (!rp) return null;

  const onb = Number(rp.onboarding_score) || 0;
  const trd = Number(rp.trading_score) || 0;
  const qz = Number(rp.quiz_score) || 0;
  const tsk = Number(rp.task_score) || 0;

  const composite = parseFloat(
    (onb * 0.4 + trd * 0.3 + qz * 0.2 + tsk * 0.1).toFixed(2),
  );

  let profile: string;
  if (composite >= 71) profile = "aggressive";
  else if (composite >= 41) profile = "moderate";
  else profile = "conservative";

  await pool.query(
    `UPDATE risk_profiles
     SET composite_score = $1, profile = $2, updated_at = NOW()
     WHERE user_id = $3`,
    [composite, profile, userId],
  );

  return { composite, profile };
}

async function refreshTradingScore(userId: string) {
  const { rows } = await pool.query(
    `SELECT * FROM trade_analytics WHERE user_id = $1`,
    [userId],
  );
  const a = rows[0];
  if (!a || Number(a.total_trades) === 0) return;

  const totalTrades = Number(a.total_trades) || 0;
  const wins = Number(a.wins) || 0;
  const totalProfit = Number(a.total_profit) || 0;
  const totalLoss = Math.abs(Number(a.total_loss) || 0);
  const equity = Number(a.equity) || 0;
  const peakEquity = Number(a.peak_equity) || 0;
  const maxDrawdown = Number(a.max_drawdown) || 0;

  const lossFollowedByTradeCount = Number(a.loss_followed_by_trade_count) || 0;
  const totalGrowthAfterLoss = Number(a.total_growth_after_loss) || 0;
  const growthUpCount = Number(a.growth_up_count) || 0;
  const growthDownCount = Number(a.growth_down_count) || 0;
  const positionChangeCountAfterLoss =
    Number(a.position_change_count_after_loss) || 0;
  const doubleAfterLossCount = Number(a.double_after_loss_count) || 0;

  const totalPositionSize = Number(a.total_position_size) || 0;
  const maxPositionSize = Number(a.max_position_size) || 0;
  const minPositionSize = Number(a.min_position_size) || 0;
  const totalTradeDuration = Number(a.total_trade_duration) || 0;
  const fastTrades = Number(a.fast_trades) || 0;

  const winRate = totalTrades > 0 ? wins / totalTrades : 0;
  const profitFactor =
    totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 10 : 0;
  const expectancy =
    totalTrades > 0 ? (totalProfit - totalLoss) / totalTrades : 0;
  const avgPositionSize = totalTrades > 0 ? totalPositionSize / totalTrades : 0;
  const avgTradeDuration =
    totalTrades > 0 ? totalTradeDuration / totalTrades : 0;

  const drawdownPct = peakEquity > 0 ? (maxDrawdown / peakEquity) * 100 : 0;
  const riskRatio = avgPositionSize > 0 ? maxPositionSize / avgPositionSize : 1;

  const profitScore = Math.max(
    0,
    Math.min(100, profitFactor >= 2 ? 100 : profitFactor * 50),
  );
  const expectancyScore = Math.max(
    0,
    Math.min(100, expectancy <= 0 ? 0 : expectancy / 10),
  );
  const drawdownScore = Math.max(0, 100 - Math.min(100, drawdownPct * 2));

  const afterLossAvgGrowth =
    lossFollowedByTradeCount > 0
      ? totalGrowthAfterLoss / lossFollowedByTradeCount
      : 1;

  let behaviorScore = 100;
  if (doubleAfterLossCount > 0)
    behaviorScore -= Math.min(40, doubleAfterLossCount * 10);
  if (afterLossAvgGrowth > 1.5)
    behaviorScore -= Math.min(25, (afterLossAvgGrowth - 1.5) * 20);
  if (positionChangeCountAfterLoss > 0)
    behaviorScore -= Math.min(20, positionChangeCountAfterLoss * 5);

  const fastTradeRate = totalTrades > 0 ? fastTrades / totalTrades : 0;
  let disciplineScore = 100;
  disciplineScore -= Math.min(40, fastTradeRate * 100 * 0.6);
  disciplineScore -= Math.min(30, Math.max(0, (riskRatio - 1) * 10));
  disciplineScore -= Math.min(
    20,
    Math.max(0, (avgTradeDuration < 60 ? 60 - avgTradeDuration : 0) / 3),
  );

  const tradingScore = parseFloat(
    (
      profitScore * 0.3 +
      expectancyScore * 0.2 +
      drawdownScore * 0.25 +
      behaviorScore * 0.15 +
      disciplineScore * 0.1
    ).toFixed(2),
  );

  const aggressiveness = parseFloat(
    Math.max(
      0,
      Math.min(
        100,
        fastTradeRate * 40 +
          Math.max(0, (riskRatio - 1) * 15) +
          Math.max(0, (maxPositionSize / 10000) * 20) +
          Math.max(0, afterLossAvgGrowth - 1) * 10,
      ),
    ).toFixed(2),
  );

  await pool.query(
    `INSERT INTO risk_profiles (user_id, trading_score, win_rate, aggressiveness, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET trading_score = $2,
           win_rate = $3,
           aggressiveness = $4,
           updated_at = NOW()`,
    [userId, tradingScore, winRate, aggressiveness],
  );
}

// ── GET /risk-profile ─────────────────────────────────────────────────────────
// Возвращает полный профиль; если строки нет — создаёт её
router.get("/", async (req: AuthRequest, res) => {
  const userId = req.userId!;

  // Убеждаемся, что строка risk_profiles существует
  await pool.query(
    `INSERT INTO risk_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId],
  );

  await refreshTradingScore(userId);
  await recalcComposite(userId);

  const { rows } = await pool.query(
    "SELECT * FROM risk_profiles WHERE user_id = $1",
    [userId],
  );
  const rp = rows[0];

  res.json({
    profile: rp?.profile ?? null,
    compositeScore: Number(rp?.composite_score) || 0,
    onboardingScore: Number(rp?.onboarding_score) || 0,
    tradingScore: Number(rp?.trading_score) || 0,
    quizScore: Number(rp?.quiz_score) || 0,
    taskScore: Number(rp?.task_score) || 0,
    winRate: Number(rp?.win_rate) || 0,
    aggressiveness: Number(rp?.aggressiveness) || 0,
    hasCompletedOnboarding: Number(rp?.onboarding_score) > 0,
  });
});

// ── GET /risk-profile/questions ───────────────────────────────────────────────
// Список вопросов вступительного теста с вариантами ответов
router.get("/questions", async (_req, res) => {
  const { rows: questions } = await pool.query(
    `SELECT id, text_ru, text_en, "order"
     FROM risk_profile_questions
     ORDER BY "order"`,
  );

  const { rows: options } = await pool.query(
    `SELECT id, question_id, text_ru, text_en, score, "order"
     FROM risk_profile_options
     ORDER BY question_id, "order"`,
  );

  const result = questions.map((q) => ({
    ...q,
    options: options.filter((o) => o.question_id === q.id),
  }));

  res.json(result);
});

// ── POST /risk-profile/onboarding ─────────────────────────────────────────────
// Body: { answers: Array<{ questionId: string; optionId: string }> }
// questionId / optionId are Firestore document/option IDs from riskProfileQuestions
router.post("/onboarding", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { answers } = req.body as {
    answers: Array<{ questionId: string; optionId: string }>;
  };

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: "Ответы не переданы" });
  }

  await pool.query(
    `INSERT INTO users (id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId],
  );
  await pool.query(
    `INSERT INTO risk_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [userId],
  );

  const adminDb = getFirestore();

  // Удаляем предыдущие ответы, если проходит повторно
  await pool.query("DELETE FROM user_risk_test_responses WHERE user_id = $1", [
    userId,
  ]);

  let totalScore = 0;
  let count = 0;

  for (const { questionId, optionId } of answers) {
    const qSnap = await adminDb
      .collection("riskProfileQuestions")
      .doc(questionId)
      .get();
    if (!qSnap.exists) continue;

    const options = (qSnap.data()?.options ?? []) as Array<{
      id: string;
      score: number;
    }>;
    const opt = options.find((o) => o.id === optionId);
    if (!opt) continue;

    await pool.query(
      `INSERT INTO user_risk_test_responses (user_id, question_id, option_id, score)
       VALUES ($1, $2, $3, $4)`,
      [userId, questionId, optionId, opt.score],
    );
    totalScore += opt.score;
    count++;
  }

  if (count === 0) {
    return res.status(400).json({ error: "Нет валидных ответов" });
  }

  // Нормализация: (raw_score - min) / (max - min) × 100
  const minScore = count * 1;
  const maxScore = count * 4;
  const onboardingScore = parseFloat(
    (((totalScore - minScore) / (maxScore - minScore)) * 100).toFixed(2),
  );

  await pool.query(
    `INSERT INTO risk_profiles (user_id, onboarding_score, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET onboarding_score = $2, updated_at = NOW()`,
    [userId, onboardingScore],
  );

  await refreshTradingScore(userId);
  const composed = await recalcComposite(userId);

  res.json({ onboardingScore, ...composed });
});

// ── POST /risk-profile/quiz-result ────────────────────────────────────────────
// Body: { lessonId, results: Array<{ questionText, selectedAnswer, correctAnswer, isCorrect, thinkingTimeMs }> }
router.post("/quiz-result", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { lessonId, results } = req.body as {
    lessonId: string;
    results: Array<{
      questionText: string;
      selectedAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      thinkingTimeMs: number;
    }>;
  };

  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: "Результаты не переданы" });
  }

  let weightedSum = 0;
  let count = 0;

  for (const r of results) {
    await pool.query(
      `INSERT INTO lesson_quiz_results
         (user_id, lesson_id, question_text, selected_answer,
          correct_answer, is_correct, thinking_time_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        userId,
        lessonId,
        r.questionText,
        r.selectedAnswer,
        r.correctAnswer,
        r.isCorrect,
        r.thinkingTimeMs,
      ],
    );

    // Базовый балл за вопрос (1 = верно, 0 = неверно)
    let score = r.isCorrect ? 1 : 0;
    const sec = r.thinkingTimeMs / 1000;

    // Бонус за скорость: верно и быстро = уверенность
    if (r.isCorrect && sec < 10) score *= 1.2;
    else if (r.isCorrect && sec > 60) score *= 0.9;
    else if (!r.isCorrect && sec < 5) score *= 0; // импульсивно неверно — 0

    weightedSum += score;
    count++;
  }

  const rawQuizScore = count > 0 ? (weightedSum / (count * 1.2)) * 100 : 0;

  // Усредняем с предыдущим quiz_score (скользящее среднее по урокам)
  const { rows } = await pool.query(
    "SELECT quiz_score FROM risk_profiles WHERE user_id = $1",
    [userId],
  );
  const prevQuizScore = Number(rows[0]?.quiz_score) || 0;
  // Если это первый урок — берём как есть; иначе усредняем 50/50
  const newQuizScore =
    prevQuizScore === 0
      ? rawQuizScore
      : parseFloat(((prevQuizScore + rawQuizScore) / 2).toFixed(2));

  await pool.query(
    `INSERT INTO risk_profiles (user_id, quiz_score, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET quiz_score = $2, updated_at = NOW()`,
    [userId, newQuizScore],
  );

  await recalcComposite(userId);
  res.json({ quizScore: newQuizScore, rawScore: rawQuizScore });
});

// ── POST /risk-profile/task-result ────────────────────────────────────────────
// Body: { lessonId, taskText, userAnswer, correctAnswer, isCorrect, thinkingTimeMs }
router.post("/task-result", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { lessonId, taskText, userAnswer, isCorrect, thinkingTimeMs } =
    req.body as {
      lessonId: string;
      taskText: string;
      userAnswer: string;
      isCorrect: boolean;
      thinkingTimeMs: number;
    };

  await pool.query(
    `INSERT INTO lesson_task_results
       (user_id, lesson_id, task_text, user_answer, is_correct, thinking_time_ms)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [userId, lessonId, taskText, userAnswer, isCorrect, thinkingTimeMs],
  );

  // Пересчитываем task_score как долю верных ответов с поправкой на время
  const { rows: allTasks } = await pool.query(
    "SELECT is_correct, thinking_time_ms FROM lesson_task_results WHERE user_id = $1",
    [userId],
  );

  let weightedSum = 0;
  for (const t of allTasks) {
    let score = t.is_correct ? 1 : 0;
    const sec = t.thinking_time_ms / 1000;
    if (t.is_correct && sec < 15) score *= 1.1;
    else if (!t.is_correct && sec < 5) score = 0;
    weightedSum += score;
  }

  const taskScore = parseFloat(
    ((weightedSum / (allTasks.length * 1.1)) * 100).toFixed(2),
  );

  await pool.query(
    `INSERT INTO risk_profiles (user_id, task_score, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET task_score = $2, updated_at = NOW()`,
    [userId, taskScore],
  );

  await recalcComposite(userId);
  res.json({ taskScore });
});

export default router;
