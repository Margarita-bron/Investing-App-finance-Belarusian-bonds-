import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import type { User, TradeAnalytics } from "../types";

interface UserDetail {
  user: User;
  analytics: TradeAnalytics | null;
}

export default function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get<User[]>("/admin/users")
      .then((r) => setUsers(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const r = await api.get<UserDetail>(`/admin/users/${id}`);
      setSelected(r.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      alert("Failed to load user: " + msg);
    } finally {
      setDetailLoading(false);
    }
  };

  const profileBadge = (p: string | null) => {
    if (!p) return <span className="badge badge-gray">—</span>;
    const cls =
      p === "conservative"
        ? "badge-blue"
        : p === "moderate"
          ? "badge-yellow"
          : "badge-red";
    return <span className={`badge ${cls}`}>{p}</span>;
  };

  const filtered = users.filter(
    (u) =>
      (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{t("users.title")}</h1>
        <input
          className="form-control"
          style={{ width: 240 }}
          placeholder={t("users.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="centered">
          <span className="spinner" />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("users.columns.name")}</th>
                  <th>{t("users.columns.uid")}</th>
                  <th>{t("users.columns.balance")}</th>
                  <th>{t("users.columns.riskProfile")}</th>
                  <th>{t("users.columns.score")}</th>
                  <th>{t("users.columns.joined")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {u.google_photo_url && (
                          <img
                            src={u.google_photo_url}
                            alt=""
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                            }}
                          />
                        )}
                        <span>
                          {u.name ?? (
                            <em className="text-muted">
                              {t("users.anonymous")}
                            </em>
                          )}
                        </span>
                      </div>
                    </td>
                    <td>
                      <code
                        className="text-sm text-muted"
                        style={{ fontFamily: "monospace" }}
                      >
                        {u.id.slice(0, 12)}…
                      </code>
                    </td>
                    <td>
                      <strong>${parseFloat(u.balance).toLocaleString()}</strong>
                    </td>
                    <td>{profileBadge(u.profile)}</td>
                    <td>
                      {u.composite_score
                        ? `${parseFloat(u.composite_score).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="text-muted">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => openDetail(u.id)}
                        disabled={detailLoading}
                      >
                        {t("common.view")}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ textAlign: "center", padding: 32 }}
                      className="text-muted"
                    >
                      {t("users.noUsersFound")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>{t("users.detail.title")}</span>
              <button
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                }}
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="flex items-center gap-3 mb-4">
                {selected.user.google_photo_url && (
                  <img
                    src={selected.user.google_photo_url}
                    alt=""
                    style={{ width: 48, height: 48, borderRadius: "50%" }}
                  />
                )}
                <div>
                  <div className="fw-bold">
                    {selected.user.name ?? t("users.anonymous")}
                  </div>
                  <div
                    className="text-sm text-muted"
                    style={{ fontFamily: "monospace" }}
                  >
                    {selected.user.id}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {[
                  [
                    t("users.detail.balance"),
                    `$${parseFloat(selected.user.balance).toLocaleString()}`,
                  ],
                  [
                    t("users.detail.deposit"),
                    `$${parseFloat(selected.user.deposit).toLocaleString()}`,
                  ],
                  [
                    t("users.detail.grossProfit"),
                    `$${parseFloat(selected.user.gross_profit).toLocaleString()}`,
                  ],
                  [
                    t("users.detail.grossLoss"),
                    `$${parseFloat(selected.user.gross_lose).toLocaleString()}`,
                  ],
                  [t("users.detail.riskProfile"), selected.user.profile ?? "—"],
                  [
                    t("users.detail.compositeScore"),
                    selected.user.composite_score
                      ? `${parseFloat(selected.user.composite_score).toFixed(1)}`
                      : "—",
                  ],
                  [
                    t("users.detail.onboardingScore"),
                    selected.user.onboarding_score
                      ? parseFloat(selected.user.onboarding_score).toFixed(1)
                      : "—",
                  ],
                  [
                    t("users.detail.tradingScore"),
                    selected.user.trading_score
                      ? parseFloat(selected.user.trading_score).toFixed(1)
                      : "—",
                  ],
                  [
                    t("users.detail.quizScore"),
                    selected.user.quiz_score
                      ? parseFloat(selected.user.quiz_score).toFixed(1)
                      : "—",
                  ],
                  [
                    t("users.detail.taskScore"),
                    selected.user.task_score
                      ? parseFloat(selected.user.task_score).toFixed(1)
                      : "—",
                  ],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div className="text-sm text-muted">{label}</div>
                    <div className="fw-bold">{val}</div>
                  </div>
                ))}
              </div>

              <div
                className="card-header"
                style={{
                  padding: "8px 0",
                  borderTop: "1px solid var(--border)",
                  marginBottom: 12,
                }}
              >
                {t("users.detail.tradeAnalytics")}
              </div>
              {selected.analytics ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 12,
                  }}
                >
                  {[
                    [
                      t("users.detail.totalTrades"),
                      selected.analytics.total_trades,
                    ],
                    [t("users.detail.wins"), selected.analytics.wins],
                    [t("users.detail.losses"), selected.analytics.losses],
                    [
                      t("users.detail.totalProfit"),
                      `$${parseFloat(selected.analytics.total_profit).toLocaleString()}`,
                    ],
                    [
                      t("users.detail.totalLoss"),
                      `$${parseFloat(selected.analytics.total_loss).toLocaleString()}`,
                    ],
                    [
                      t("users.detail.maxDrawdown"),
                      `$${parseFloat(selected.analytics.max_drawdown).toLocaleString()}`,
                    ],
                    [
                      t("users.detail.winStreak"),
                      selected.analytics.longest_win_streak,
                    ],
                    [
                      t("users.detail.equity"),
                      `$${parseFloat(selected.analytics.equity).toLocaleString()}`,
                    ],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div className="text-sm text-muted">{label}</div>
                      <div className="fw-bold">{String(val)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted text-sm">
                  {t("users.detail.noTrades")}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setSelected(null)}
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
