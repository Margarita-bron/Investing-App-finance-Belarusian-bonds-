import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useAuth } from "../components/AuthContext";
import type { Admin } from "../types";

export default function Admins() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUid, setNewUid] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAdmins = () => {
    setLoading(true);
    api
      .get<Admin[]>("/admin/admins")
      .then((r) => setAdmins(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAdd = async () => {
    if (!newUid.trim()) {
      setAddError(t("admins.uidRequired"));
      return;
    }
    setAdding(true);
    setAddError(null);
    setAddSuccess(false);
    try {
      await api.post("/admin/admins", {
        uid: newUid.trim(),
        createdBy: user?.uid ?? "",
      });
      setAddSuccess(true);
      setNewUid("");
      fetchAdmins();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add admin";
      setAddError(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (uid === user?.uid) {
      alert(t("admins.cannotRemoveSelf"));
      return;
    }
    if (!confirm(t("admins.removeConfirm", { uid }))) return;
    setDeletingId(uid);
    try {
      await api.delete(`/admin/admins/${uid}`);
      setAdmins((prev) => prev.filter((a) => a.id !== uid));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      alert("Error: " + msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{t("admins.title")}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card card-body mb-4" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700 }}>
          {t("admins.grantAdminAccess")}
        </h3>
        <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
          {t("admins.grantAccessDescription")}
        </p>
        {addError && <div className="alert alert-error">{addError}</div>}
        {addSuccess && (
          <div className="alert alert-success">{t("admins.adminAdded")}</div>
        )}
        <div className="flex gap-2 items-center">
          <input
            className="form-control"
            style={{ flex: 1, maxWidth: 400 }}
            placeholder={t("admins.uidPlaceholder")}
            value={newUid}
            onChange={(e) => setNewUid(e.target.value)}
            disabled={adding}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={adding || !newUid.trim()}
          >
            {adding ? t("common.adding") : t("admins.grantAccess")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="centered">
          <span className="spinner" />
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            {t("admins.adminList")} ({admins.length})
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("admins.columns.user")}</th>
                  <th>{t("admins.columns.uid")}</th>
                  <th>{t("admins.columns.addedBy")}</th>
                  <th>{t("admins.columns.addedOn")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {a.google_photo_url && (
                          <img
                            src={a.google_photo_url}
                            alt=""
                            style={{ width: 28, height: 28, borderRadius: "50%" }}
                          />
                        )}
                        <div>
                          <div className="fw-bold">{a.name ?? "—"}</div>
                          {a.id === user?.uid && (
                            <span className="badge badge-blue" style={{ fontSize: 10 }}>
                              {t("admins.you")}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <code style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-secondary)" }}>
                        {a.id}
                      </code>
                    </td>
                    <td className="text-muted">{a.created_by ?? "—"}</td>
                    <td className="text-muted">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(a.id)}
                        disabled={deletingId === a.id || a.id === user?.uid}
                      >
                        {deletingId === a.id ? t("common.removing") : t("common.remove")}
                      </button>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 32 }} className="text-muted">
                      {t("admins.noAdminsFound")}
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
