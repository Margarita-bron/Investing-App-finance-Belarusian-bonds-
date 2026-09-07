// ── Users ──────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string | null;
  google_photo_url: string | null;
  balance: string;
  deposit: string;
  gross_profit: string;
  gross_lose: string;
  created_at: string;
  // joined from risk_profiles
  profile: "conservative" | "moderate" | "aggressive" | null;
  composite_score: string | null;
  onboarding_score: string | null;
  trading_score: string | null;
  quiz_score: string | null;
  task_score: string | null;
}

export interface TradeAnalytics {
  user_id: string;
  total_trades: number;
  wins: number;
  losses: number;
  total_profit: string;
  total_loss: string;
  equity: string;
  peak_equity: string;
  max_drawdown: string;
  current_win_streak: number;
  longest_win_streak: number;
  updated_at: string;
}

// ── Bonds ──────────────────────────────────────────────────────────────────
export interface Bond {
  id: string;
  name: string;
  issuer: string;
  type: "government" | "corporate" | "banking";
  currency: string;
  nominal_value: string;
  current_price: string;
  coupon_rate: string;
  coupon_frequency: number;
  maturity_date: string;
  ytm: string | null;
  duration: string | null;
  modified_duration: string | null;
  years_to_maturity: string | null;
  quality_score: string | null;
  real_yield: string | null;
  spread_over_deposit: string | null;
  updated_at: string;
}

// ── Companies ──────────────────────────────────────────────────────────────
export interface Company {
  id: number;
  issuer_name: string;
  display_name: string | null;
  description: string | null;
  website: string | null;
  industry: string | null;
  logo_storage_path: string | null;
  created_at: string;
  updated_at: string;
}

// ── Risk profile questions ─────────────────────────────────────────────────
export interface RiskOption {
  id: number;
  question_id: number;
  text_ru: string;
  text_en: string;
  score: number;
  order: number;
}

export interface RiskQuestion {
  id: number;
  text_ru: string;
  text_en: string;
  order: number;
  created_at: string;
  options: RiskOption[];
}

// ── Macro data ─────────────────────────────────────────────────────────────
export interface MacroData {
  id: number;
  month: string;
  inflation_rate: string;
  avg_deposit_rate: string;
  created_at: string;
}

// ── Admins ─────────────────────────────────────────────────────────────────
export interface Admin {
  id: string;
  created_by: string | null;
  created_at: string;
  name: string | null;
  google_photo_url: string | null;
}

// ── Firestore Courses/Lessons ──────────────────────────────────────────────
export interface Course {
  id: string;
  title: string;
  order: number;
  description?: string;
  imageUrl?: string;
}

export interface LessonSummary {
  id: string;
  title: string;
  order: number;
}

export type SectionType =
  | "heading"
  | "body"
  | "infobox"
  | "bullets"
  | "table"
  | "definition_table";

export interface Section {
  id?: string;
  type: SectionType;
  text?: string;
  title?: string;
  color?: string;
  items?: string[];
  rows?: [string, string][];
  order: number;
}

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id?: string;
  text: string;
  options: QuizOption[];
  order: number;
}

export interface Task {
  text: string;
  correctAnswer?: string;
  options?: string[];
  correctOptionIndex?: number;
  imageUrl?: string;
}

export interface Lesson {
  id: string;
  title: string;
  order: number;
  imageUrl?: string;
  sections: Section[];
  questions: QuizQuestion[];
  task: Task | null;
}
