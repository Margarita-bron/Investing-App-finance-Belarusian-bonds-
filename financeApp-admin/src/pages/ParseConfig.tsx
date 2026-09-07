import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Editor from "@monaco-editor/react";
import { useTheme } from "../components/ThemeContext";
import api from "../api";

export default function ParseConfig() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ code: string }>("/admin/parse-config")
      .then((r) => setCode(r.data.code))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await api.put("/admin/parse-config", { code });
      setSaveSuccess(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleParseNow = async () => {
    setParsing(true);
    setParseMsg(null);
    try {
      await api.post("/admin/parse-now");
      setParseMsg(t("parseConfig.scrapeStarted"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      setParseMsg("Error: " + msg);
    } finally {
      setParsing(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{t("parseConfig.title")}</h1>
        <div className="flex gap-2 items-center">
          {parseMsg && (
            <span
              className="text-sm"
              style={{
                color: parseMsg.startsWith("Error") ? "var(--error)" : "var(--success)",
                maxWidth: 320,
              }}
            >
              {parseMsg}
            </span>
          )}
          <button className="btn btn-outline" onClick={handleParseNow} disabled={parsing}>
            {parsing ? t("common.starting") : t("parseConfig.parseNow")}
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? t("common.saving") : t("parseConfig.saveConfig")}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {saveError && <div className="alert alert-error">{saveError}</div>}
      {saveSuccess && <div className="alert alert-success">{t("parseConfig.configSaved")}</div>}

      <div className="alert alert-info">
        {t("parseConfig.description")}
      </div>

      {loading ? (
        <div className="centered">
          <span className="spinner" />
        </div>
      ) : (
        <div
          className="card"
          style={{ overflow: "hidden", height: "calc(100vh - 280px)", minHeight: 400 }}
        >
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={code}
            onChange={(val) => setCode(val ?? "")}
            theme={theme === "dark" ? "vs-dark" : "vs-light"}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              lineNumbers: "on",
              tabSize: 2,
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </div>
      )}
    </>
  );
}
