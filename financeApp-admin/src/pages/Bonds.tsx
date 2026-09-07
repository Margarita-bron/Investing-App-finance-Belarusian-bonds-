import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import type { Bond } from "../types";

export default function Bonds() {
  const { t } = useTranslation();
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState<string | null>(null);

  const fetchBonds = () => {
    setLoading(true);
    setParseMsg(null);
    api
      .get<Bond[]>("/admin/bonds")
      .then((r) => setBonds(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBonds();
  }, []);

  const triggerParse = async () => {
    setParsing(true);
    try {
      setParseMsg(t("bonds.updateStarted"));
      await api.post("/admin/parse-now");
      setTimeout(() => {
        setParseMsg(t("bonds.updateFinished"));
      }, 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      setParseMsg("Error: " + msg);
    } finally {
      setParsing(false);
    }
  };

  const filtered = bonds.filter((b) => {
    const matchType = typeFilter === "all" || b.type === typeFilter;
    const matchSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.issuer.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const typeBadge = (type: string) => {
    const cls =
      type === "government" ? "badge-blue" : type === "corporate" ? "badge-yellow" : "badge-green";
    return <span className={`badge ${cls}`}>{t(`bonds.${type}`, type)}</span>;
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{t("bonds.title")} ({bonds.length})</h1>
        <div className="flex gap-2 items-center">
          {parseMsg && (
            <span
              className="text-sm"
              style={{ color: parseMsg.startsWith("Error") ? "var(--error)" : "var(--success)" }}
            >
              {parseMsg}
            </span>
          )}
          <button className="btn btn-primary" onClick={triggerParse} disabled={parsing}>
            {parsing ? t("common.starting") : t("bonds.updateNow")}
          </button>
          <button className="btn btn-secondary" onClick={fetchBonds} disabled={loading}>
            {t("common.refresh")}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="flex gap-2 mb-4">
        <input
          className="form-control"
          style={{ width: 240 }}
          placeholder={t("bonds.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-control"
          style={{ width: 160 }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">{t("bonds.allTypes")}</option>
          <option value="government">{t("bonds.government")}</option>
          <option value="corporate">{t("bonds.corporate")}</option>
          <option value="banking">{t("bonds.banking")}</option>
        </select>
      </div>

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
                  <th>{t("bonds.columns.name")}</th>
                  <th>{t("bonds.columns.issuer")}</th>
                  <th>{t("bonds.columns.type")}</th>
                  <th>{t("bonds.columns.currency")}</th>
                  <th>{t("bonds.columns.price")}</th>
                  <th>{t("bonds.columns.ytm")}</th>
                  <th>{t("bonds.columns.duration")}</th>
                  <th>{t("bonds.columns.quality")}</th>
                  <th>{t("bonds.columns.maturity")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span className="fw-bold" style={{ fontSize: 13 }}>{b.name}</span>
                    </td>
                    <td className="text-muted">{b.issuer}</td>
                    <td>{typeBadge(b.type)}</td>
                    <td>{b.currency}</td>
                    <td>{parseFloat(b.current_price).toLocaleString()}</td>
                    <td>
                      {b.ytm ? (
                        <span className={parseFloat(b.ytm) > 0 ? "badge badge-green" : "badge badge-red"}>
                          {(parseFloat(b.ytm) * 100).toFixed(2)}%
                        </span>
                      ) : "—"}
                    </td>
                    <td>{b.duration ? parseFloat(b.duration).toFixed(2) : "—"}</td>
                    <td>
                      {b.quality_score ? (
                        <span className="badge badge-blue">{parseFloat(b.quality_score).toFixed(0)}</span>
                      ) : "—"}
                    </td>
                    <td className="text-muted">
                      {b.maturity_date ? new Date(b.maturity_date).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: 32 }} className="text-muted">
                      {t("bonds.noBondsFound")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
