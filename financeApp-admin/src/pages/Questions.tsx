import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import type { RiskQuestion } from "../types";

interface OptionDraft {
  textRu: string;
  textEn: string;
  score: number;
  order: number;
}

interface FormState {
  textRu: string;
  textEn: string;
  order: number;
  options: OptionDraft[];
}

const EMPTY_OPTION: OptionDraft = { textRu: "", textEn: "", score: 1, order: 1 };

const EMPTY_FORM: FormState = {
  textRu: "",
  textEn: "",
  order: 1,
  options: [
    { ...EMPTY_OPTION, order: 1, score: 1 },
    { ...EMPTY_OPTION, order: 2, score: 2 },
    { ...EMPTY_OPTION, order: 3, score: 3 },
    { ...EMPTY_OPTION, order: 4, score: 4 },
  ],
};

export default function Questions() {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<RiskQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchQuestions = () => {
    setLoading(true);
    api
      .get<RiskQuestion[]>("/admin/questions")
      .then((r) => setQuestions(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const openCreate = () => {
    const nextOrder = Math.max(0, ...questions.map((q) => q.order)) + 1;
    setEditingId(null);
    setForm({ ...EMPTY_FORM, order: nextOrder });
    setSaveError(null);
    setShowModal(true);
  };

  const openEdit = (q: RiskQuestion) => {
    setEditingId(q.id);
    setForm({
      textRu: q.text_ru,
      textEn: q.text_en,
      order: q.order,
      options: q.options.map((o) => ({
        textRu: o.text_ru,
        textEn: o.text_en,
        score: o.score,
        order: o.order,
      })),
    });
    setSaveError(null);
    setShowModal(true);
  };

  const updateOption = (idx: number, field: keyof OptionDraft, value: string | number) => {
    setForm((prev) => {
      const opts = [...prev.options];
      opts[idx] = { ...opts[idx], [field]: value };
      return { ...prev, options: opts };
    });
  };

  const addOption = () => {
    setForm((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        { textRu: "", textEn: "", score: 1, order: prev.options.length + 1 },
      ],
    }));
  };

  const removeOption = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx).map((o, i) => ({ ...o, order: i + 1 })),
    }));
  };

  const handleSave = async () => {
    if (!form.textRu.trim() || !form.textEn.trim()) {
      setSaveError(t("questions.bothLangsRequired"));
      return;
    }
    if (form.options.length < 2) {
      setSaveError(t("questions.minTwoOptions"));
      return;
    }
    for (const opt of form.options) {
      if (!opt.textRu.trim() || !opt.textEn.trim()) {
        setSaveError(t("questions.allOptionsBothLangs"));
        return;
      }
    }

    setSaving(true);
    setSaveError(null);
    try {
      if (editingId !== null) {
        await api.put(`/admin/questions/${editingId}`, {
          textRu: form.textRu.trim(),
          textEn: form.textEn.trim(),
          order: form.order,
        });
      } else {
        await api.post("/admin/questions", {
          textRu: form.textRu.trim(),
          textEn: form.textEn.trim(),
          order: form.order,
          options: form.options,
        });
      }
      fetchQuestions();
      setShowModal(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("questions.deleteConfirm"))) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/questions/${id}`);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      alert("Error: " + msg);
    } finally {
      setDeletingId(null);
    }
  };

  const scoreBadge = (score: number) => {
    const colors = ["", "badge-green", "badge-blue", "badge-yellow", "badge-red"];
    return <span className={`badge ${colors[score] ?? "badge-gray"}`}>score {score}</span>;
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{t("questions.title")}</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          {t("questions.addQuestion")}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="centered">
          <span className="spinner" />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {questions.length === 0 && (
            <div className="card card-body text-muted" style={{ textAlign: "center", padding: 32 }}>
              {t("questions.noQuestionsYet")}
            </div>
          )}
          {questions.map((q) => (
            <div className="card" key={q.id}>
              <div
                className="card-header"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
              >
                <div>
                  <span className="badge badge-gray" style={{ marginRight: 8 }}>#{q.order}</span>
                  <strong>{q.text_ru}</strong>
                  <div className="text-sm text-muted" style={{ marginTop: 4 }}>{q.text_en}</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(q)}>
                    {t("common.edit")}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(q.id)}
                    disabled={deletingId === q.id}
                  >
                    {deletingId === q.id ? t("common.deleting") : t("common.delete")}
                  </button>
                </div>
              </div>
              <div className="card-body" style={{ padding: "12px 20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {q.options.map((o) => (
                    <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {scoreBadge(o.score)}
                      <span style={{ fontSize: 13 }}>{o.text_ru}</span>
                      <span className="text-muted" style={{ fontSize: 12 }}>/ {o.text_en}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <span>{editingId !== null ? t("questions.editQuestion") : t("questions.newQuestion")}</span>
              <button
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}
                onClick={() => !saving && setShowModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {saveError && <div className="alert alert-error">{saveError}</div>}

              <div className="form-group">
                <label className="form-label">{t("questions.textRussian")}</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.textRu}
                  onChange={(e) => setForm({ ...form, textRu: e.target.value })}
                  disabled={saving}
                  placeholder={t("questions.textRuPlaceholder")}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("questions.textEnglish")}</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.textEn}
                  onChange={(e) => setForm({ ...form, textEn: e.target.value })}
                  disabled={saving}
                  placeholder={t("questions.textEnPlaceholder")}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("questions.order")}</label>
                <input
                  className="form-control"
                  type="number"
                  min={1}
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 1 })}
                  disabled={saving}
                  style={{ width: 100 }}
                />
              </div>

              {editingId === null && (
                <>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 4, marginBottom: 10 }}>
                    <div className="flex justify-between items-center mb-4" style={{ marginBottom: 10 }}>
                      <strong style={{ fontSize: 13 }}>{t("questions.answerOptions")}</strong>
                      <button className="btn btn-outline btn-sm" type="button" onClick={addOption}>
                        {t("questions.addOption")}
                      </button>
                    </div>
                    {form.options.map((opt, idx) => (
                      <div
                        key={idx}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius)",
                          padding: "10px 12px",
                          marginBottom: 8,
                          background: "var(--bg)",
                        }}
                      >
                        <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                          <span className="text-sm fw-bold">{t("questions.option", { num: idx + 1 })}</span>
                          <div className="flex gap-2 items-center">
                            <label className="text-sm text-muted">{t("questions.score")}</label>
                            <select
                              className="form-control"
                              style={{ width: 70, padding: "3px 8px" }}
                              value={opt.score}
                              onChange={(e) => updateOption(idx, "score", parseInt(e.target.value))}
                              disabled={saving}
                            >
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                            </select>
                            {form.options.length > 2 && (
                              <button
                                className="btn btn-danger btn-sm"
                                type="button"
                                onClick={() => removeOption(idx)}
                                disabled={saving}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <input
                            className="form-control"
                            placeholder={t("questions.optionTextRu")}
                            value={opt.textRu}
                            onChange={(e) => updateOption(idx, "textRu", e.target.value)}
                            disabled={saving}
                          />
                          <input
                            className="form-control"
                            placeholder={t("questions.optionTextEn")}
                            value={opt.textEn}
                            onChange={(e) => updateOption(idx, "textEn", e.target.value)}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="alert alert-info" style={{ fontSize: 12 }}>
                    {t("questions.optionsNote")}
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                {t("common.cancel")}
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? t("common.saving")
                  : editingId !== null
                    ? t("questions.update")
                    : t("questions.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
