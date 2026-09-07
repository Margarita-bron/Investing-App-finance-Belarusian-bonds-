import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../components/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const { signInWithGoogle, user, loading } = useAuth();
  const { t } = useTranslation();
  const [loadingSign, setLoadingSign] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !loading) {
      navigate("/users", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    setLoadingSign(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login failed";
      setError(msg);
    } finally {
      setLoadingSign(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <div className="card" style={{ width: 360, padding: 0 }}>
        <div
          style={{
            background: "var(--sidebar-bg)",
            borderRadius: "var(--radius) var(--radius) 0 0",
            padding: "32px 24px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>
            FintechApp Admin
          </h1>
          <p style={{ color: "var(--sidebar-text)", fontSize: 13, marginTop: 6 }}>
            {t("login.subtitle")}
          </p>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-error">{error}</div>}
          <button
            className="btn btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              gap: 10,
              padding: "10px 16px",
              fontSize: 14,
            }}
            onClick={handleLogin}
            disabled={loadingSign}
          >
            {loadingSign ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                {t("login.signingIn")}
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.4 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.8 6C12.5 13 17.9 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9C43.6 37.5 46.5 31.4 46.5 24.5z" />
                  <path fill="#FBBC05" d="M10.6 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l8.1-6z" />
                  <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9C29.6 38.4 27 39.2 24 39.2c-6.1 0-11.3-4-13.2-9.5l-8 6.2C6.7 43.6 14.7 48 24 48z" />
                </svg>
                {t("login.continueWithGoogle")}
              </>
            )}
          </button>
          <p className="text-sm text-muted" style={{ textAlign: "center", marginTop: 14 }}>
            {t("login.mustHaveAdmin")}
          </p>
        </div>
      </div>
    </div>
  );
}
