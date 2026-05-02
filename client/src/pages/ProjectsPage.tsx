import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import type { ProjectSummary } from "../types";
import { ApiError } from "../api";

export default function ProjectsPage() {
  const { token, logout, user } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!token) return;
    const res = await api<{ projects: ProjectSummary[] }>("/api/projects", { token });
    setProjects(res.projects);
  }

  useEffect(() => {
    void load().catch(() => setProjects([]));
  }, [token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setBusy(true);
    try {
      await api("/api/projects", {
        method: "POST",
        token,
        body: JSON.stringify({
          name,
          description: description.trim() || null,
        }),
      });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <h1 className="logo">Team Task Manager</h1>
          <p className="muted small">Signed in as {user?.email}</p>
        </div>
        <button type="button" className="btn ghost" onClick={logout}>
          Log out
        </button>
      </header>

      <section className="grid two">
        <div className="card">
          <h2>New project</h2>
          <p className="muted small">You become the project admin and can invite members.</p>
          <form onSubmit={onCreate} className="stack">
            <label className="field">
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="field">
              <span>Description (optional)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? "Creating…" : "Create project"}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Your projects</h2>
          {projects.length === 0 ? (
            <p className="muted">No projects yet — create one on the left.</p>
          ) : (
            <ul className="project-list">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link to={`/projects/${p.id}`} className="project-row">
                    <div>
                      <strong>{p.name}</strong>
                      <span className="badge">{p.role}</span>
                      <p className="muted small">
                        {p.taskCount} tasks · {p.memberCount} members
                      </p>
                    </div>
                    <span className="chevron">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
