import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import type { MacroData } from "../types";

export default function Macro() {
  const { t } = useTranslation();
  const [macro, setMacro] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inflation, setInflation] = useState("");
  const [deposit, setDeposit] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<MacroData | null>("/admin/macro")
      .then((r) => {
        setMacro(r.data);
        if (r.data) {
          setInflation(parseFloat(r.data.inflation_rate).toString());
          setDeposit(parseFloat(r.data.avg_deposit_rate).toString());
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const inflationNum = parseFloat(inflation);
    const depositNum = parseFloat(deposit);
    if (isNaN(inflationNum) || isNaN(depositNum)) {
      setSaveError(t("macro.bothValuesMustBeNumbers"));
      return;
    }
    setSaving(true);
    setSuccess(false);
    setSaveError(null);
    try {
      const r = await api.put<MacroData>("/admin/macro", {
        inflationRate: inflationNum,
        avgDepositRate: depositNum,
      });
      setMacro(r.data);
      setSuccess(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v: string | undefined) =>
    v ? `${(parseFloat(v) * 100).toFixed(1)}%` : "—";

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{t("macro.title")}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="centered">
          <span className="spinner" />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="card card-body">
            <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>
              {t("macro.currentValues")}
            </h3>
            {macro ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div className="text-sm text-muted">{t("macro.month")}</div>
                  <div className="fw-bold">{macro.month}</div>
                </div>
                <div>
                  <div className="text-sm text-muted">{t("macro.inflationRate")}</div>
                  <div className="fw-bold" style={{ fontSize: 28, color: "var(--error)" }}>
                    {fmt(macro.inflation_rate)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted">{t("macro.avgDepositRate")}</div>
                  <div className="fw-bold" style={{ fontSize: 28, color: "var(--success)" }}>
                    {fmt(macro.avg_deposit_rate)}
                  </div>
                </div>
                <div className="text-sm text-muted">
                  {t("macro.lastUpdated")} {new Date(macro.created_at).toLocaleString()}
                </div>
              </div>
            ) : (
              <p className="text-muted">{t("macro.noMacroData")}</p>
            )}
          </div>

          <div className="card card-body">
            <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>
              {t("macro.updateForMonth")}
            </h3>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
              {t("macro.valuesDecimalNote")}
            </p>

            {saveError && <div className="alert alert-error">{saveError}</div>}
            {success && <div className="alert alert-success">{t("macro.macroDataUpdated")}</div>}

            <div className="form-group">
              <label className="form-label">{t("macro.inflationRateDecimal")}</label>
              <input
                className="form-control"
                type="number"
                step="0.001"
                min="0"
                max="1"
                value={inflation}
                onChange={(e) => setInflation(e.target.value)}
                placeholder="e.g. 0.085"
                disabled={saving}
              />
              {inflation && !isNaN(parseFloat(inflation)) && (
                <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                  = {(parseFloat(inflation) * 100).toFixed(2)}%
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">{t("macro.avgDepositRateDecimal")}</label>
              <input
                className="form-control"
                type="number"
                step="0.001"
                min="0"
                max="1"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder="e.g. 0.1025"
                disabled={saving}
              />
              {deposit && !isNaN(parseFloat(deposit)) && (
                <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                  = {(parseFloat(deposit) * 100).toFixed(2)}%
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? t("common.saving") : t("macro.saveMacroData")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
