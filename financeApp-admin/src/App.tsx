import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { ThemeProvider } from "./components/ThemeContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Bonds from "./pages/Bonds";
import Companies from "./pages/Companies";
import Courses from "./pages/Courses";
import Questions from "./pages/Questions";
import Macro from "./pages/Macro";
import Admins from "./pages/Admins";
import ParseConfig from "./pages/ParseConfig";

function RequireAuth() {
  const { user, loading, isAdmin } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48 }}>🚫</div>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{t("auth.accessDenied")}</h2>
        <p style={{ color: "var(--text-secondary)", maxWidth: 360 }}>
          {t("auth.noAdminPrivileges", { email: user.email })}
        </p>
        <button
          className="btn btn-secondary"
          onClick={() => {
            import("firebase/auth").then(({ signOut }) => {
              import("./firebase").then(({ auth }) => signOut(auth));
            });
          }}
        >
          {t("auth.signOut")}
        </button>
      </div>
    );
  }

  return <Outlet />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<RequireAuth />}>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="/users" replace />} />
                <Route path="users" element={<Users />} />
                <Route path="bonds" element={<Bonds />} />
                <Route path="companies" element={<Companies />} />
                <Route path="courses" element={<Courses />} />
                <Route path="questions" element={<Questions />} />
                <Route path="macro" element={<Macro />} />
                <Route path="admins" element={<Admins />} />
                <Route path="parse-config" element={<ParseConfig />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/users" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
