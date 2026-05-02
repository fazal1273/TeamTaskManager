import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectPage from "./pages/ProjectPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="shell center">
        <p className="muted">Loading…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <div className="app-root">
      <Routes>
        <Route
          path="/login"
          element={
            loading ? (
              <div className="shell center">
                <p className="muted">Loading…</p>
              </div>
            ) : user ? (
              <Navigate to="/projects" replace />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/register"
          element={
            loading ? (
              <div className="shell center">
                <p className="muted">Loading…</p>
              </div>
            ) : user ? (
              <Navigate to="/projects" replace />
            ) : (
              <RegisterPage />
            )
          }
        />
        <Route
          path="/projects"
          element={
            <Protected>
              <ProjectsPage />
            </Protected>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <Protected>
              <ProjectPage />
            </Protected>
          }
        />
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </div>
  );
}
