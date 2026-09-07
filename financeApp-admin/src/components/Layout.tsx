import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";
import i18n from "../i18n";

const NAV_KEYS = [
  { to: "/users", labelKey: "nav.users", icon: "👥" },
  { to: "/bonds", labelKey: "nav.bonds", icon: "📊" },
  { to: "/companies", labelKey: "nav.companies", icon: "🏢" },
  { to: "/courses", labelKey: "nav.courses", icon: "📚" },
  {
    to: "/questions",
    labelKey: "nav.questions",
    icon: "M7.702 1.368a.75.75 0 0 1 .597 0c2.098.91 4.105 1.99 6.004 3.223a.75.75 0 0 1-.194 1.348A34.27 34.27 0 0 0 8.341 8.25a.75.75 0 0 1-.682 0c-.625-.32-1.262-.62-1.909-.901v-.542a36.878 36.878 0 0 1 2.568-1.33.75.75 0 0 0-.636-1.357 38.39 38.39 0 0 0-3.06 1.605.75.75 0 0 0-.372.648v.365c-.773-.294-1.56-.56-2.359-.8a.75.75 0 0 1-.194-1.347 40.901 40.901 0 0 1 6.005-3.223ZM4.25 8.348c-.53-.212-1.067-.411-1.611-.596a40.973 40.973 0 0 0-.418 2.97.75.75 0 0 0 .474.776c.175.068.35.138.524.21a5.544 5.544 0 0 1-.58.681.75.75 0 1 0 1.06 1.06c.35-.349.655-.726.915-1.124a29.282 29.282 0 0 0-1.395-.617A5.483 5.483 0 0 0 4.25 8.5v-.152Z",
  },
  { to: "/macro", labelKey: "nav.macro", icon: "📈" },
  { to: "/admins", labelKey: "nav.admins", icon: "🛡️" },
  { to: "/parse-config", labelKey: "nav.parseConfig", icon: "⚙️" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  const switchLang = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  const currentLang = i18n.language;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          Fintech<span>Admin</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_KEYS.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {t(n.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">{user?.email}</div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ width: "100%" }}
            onClick={logout}
          >
            {t("layout.signOut")}
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <span>{t("layout.title")}</span>
          <div className="topbar-controls">
            <button
              className={`lang-btn${currentLang === "ru" ? " active" : ""}`}
              onClick={() => switchLang("ru")}
            >
              RU
            </button>
            <button
              className={`lang-btn${currentLang === "en" ? " active" : ""}`}
              onClick={() => switchLang("en")}
            >
              EN
            </button>
            <button
              className="icon-btn"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
