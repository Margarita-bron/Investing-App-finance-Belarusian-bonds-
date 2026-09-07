import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import api from "../api";
import type { Company } from "../types";
import { uploadImage } from "../firebase/image";

interface FormState {
  issuerName: string;
  displayName: string;
  description: string;
  website: string;
  industry: string;
}

const EMPTY_FORM: FormState = {
  issuerName: "",
  displayName: "",
  description: "",
  website: "",
  industry: "",
};

export default function Companies() {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Company[]>("/companies");
      setCompanies(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("companies.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const openCreate = (issuer?: string) => {
    setForm({ ...EMPTY_FORM, issuerName: issuer ?? "" });
    setLogoFile(null);
    setLogoPreview(null);
    setUploadProgress(null);
    setSaveError(null);
    setSaveSuccess(false);
    setShowModal(true);
  };

  const openEdit = (c: Company) => {
    setForm({
      issuerName: c.issuer_name,
      displayName: c.display_name ?? "",
      description: c.description ?? "",
      website: c.website ?? "",
      industry: c.industry ?? "",
    });
    setLogoFile(null);
    setLogoPreview(c.logo_storage_path ?? null);
    setUploadProgress(null);
    setSaveError(null);
    setSaveSuccess(false);
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  const handleSave = async () => {
    if (!form.issuerName.trim()) {
      setSaveError(t("companies.issuerNameRequired"));
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      let imageUrl: string | undefined;
      if (logoFile) {
        imageUrl = await uploadImage(logoFile);
      }
      await api.post("/companies", {
        issuerName: form.issuerName.trim(),
        displayName: form.displayName.trim() || undefined,
        description: form.description.trim() || undefined,
        website: form.website.trim() || undefined,
        industry: form.industry.trim() || undefined,
        logoStoragePath: imageUrl,
      });
      setSaveSuccess(true);
      fetchCompanies();
      setTimeout(() => setShowModal(false), 800);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setSaveError(msg);
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{t("companies.title")}</h1>
        <button className="btn btn-primary" onClick={() => openCreate()}>
          {t("companies.addCompany")}
        </button>
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
                  <th>{t("companies.columns.logo")}</th>
                  <th>{t("companies.columns.issuerName")}</th>
                  <th>{t("companies.columns.displayName")}</th>
                  <th>{t("companies.columns.industry")}</th>
                  <th>{t("companies.columns.website")}</th>
                  <th>{t("companies.columns.updated")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.issuer_name}>
                    <td>
                      {c.logo_storage_path ? (
                        <img
                          src={c.logo_storage_path}
                          alt={c.display_name ?? c.issuer_name}
                          style={{
                            width: 36,
                            height: 36,
                            objectFit: "contain",
                            borderRadius: 4,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 4,
                            background: "var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                          }}
                        >
                          🏢
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="fw-bold">{c.issuer_name}</span>
                    </td>
                    <td>
                      {c.display_name ?? <em className="text-muted">—</em>}
                    </td>
                    <td>
                      {c.industry ? (
                        <span className="tag">{c.industry}</span>
                      ) : (
                        <em className="text-muted">—</em>
                      )}
                    </td>
                    <td>
                      {c.website ? (
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--primary)" }}
                        >
                          {c.website.replace(/^https?:\/\//, "").slice(0, 30)}
                        </a>
                      ) : (
                        <em className="text-muted">—</em>
                      )}
                    </td>
                    <td className="text-muted">
                      {c.updated_at
                        ? new Date(c.updated_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => openEdit(c)}
                      >
                        {t("common.edit")}
                      </button>
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ textAlign: "center", padding: 32 }}
                      className="text-muted"
                    >
                      {t("companies.noCompaniesYet")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => !saving && setShowModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>
                {form.issuerName
                  ? t("companies.modal.editCompany", { name: form.issuerName })
                  : t("companies.modal.addCompany")}
              </span>
              <button
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                }}
                onClick={() => !saving && setShowModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {saveError && (
                <div className="alert alert-error">{saveError}</div>
              )}
              {saveSuccess && (
                <div className="alert alert-success">
                  {t("companies.savedSuccessfully")}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  {t("companies.modal.issuerName")}
                </label>
                <input
                  className="form-control"
                  value={form.issuerName}
                  onChange={(e) =>
                    setForm({ ...form, issuerName: e.target.value })
                  }
                  placeholder={t("companies.modal.issuerNamePlaceholder")}
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {t("companies.modal.displayName")}
                </label>
                <input
                  className="form-control"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm({ ...form, displayName: e.target.value })
                  }
                  placeholder={t("companies.modal.displayNamePlaceholder")}
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {t("companies.modal.description")}
                </label>
                <textarea
                  className="form-control"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder={t("companies.modal.descriptionPlaceholder")}
                  rows={3}
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {t("companies.modal.website")}
                </label>
                <input
                  className="form-control"
                  value={form.website}
                  onChange={(e) =>
                    setForm({ ...form, website: e.target.value })
                  }
                  placeholder="https://example.com"
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {t("companies.modal.industry")}
                </label>
                <input
                  className="form-control"
                  value={form.industry}
                  onChange={(e) =>
                    setForm({ ...form, industry: e.target.value })
                  }
                  placeholder={t("companies.modal.industryPlaceholder")}
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {t("companies.modal.logo")}
                </label>
                {logoPreview && (
                  <div style={{ marginBottom: 8 }}>
                    <img
                      src={logoPreview}
                      alt="Preview"
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: "contain",
                        borderRadius: 4,
                        border: "1px solid var(--border)",
                      }}
                    />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                  type="button"
                >
                  {logoFile ? logoFile.name : t("companies.modal.chooseImage")}
                </button>
                {uploadProgress !== null && (
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        background: "var(--border)",
                        borderRadius: 4,
                        height: 6,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${uploadProgress}%`,
                          background: "var(--primary)",
                          transition: "width 0.2s",
                        }}
                      />
                    </div>
                    <div
                      className="text-sm text-muted"
                      style={{ marginTop: 4 }}
                    >
                      {t("companies.modal.uploading", {
                        progress: uploadProgress,
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                {t("common.cancel")}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
