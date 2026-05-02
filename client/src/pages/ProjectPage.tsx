import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import type { DashboardSummary, ProjectDetail, Task, TaskStatus } from "../types";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { token, user } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberInviteError, setMemberInviteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = project?.yourRole === "ADMIN";

  const loadAll = useCallback(async () => {
    if (!token || !projectId) return;
    const [p, d, t] = await Promise.all([
      api<{ project: ProjectDetail }>(`/api/projects/${projectId}`, { token }),
      api<DashboardSummary>(`/api/projects/${projectId}/dashboard`, { token }),
      api<{ tasks: Task[] }>(`/api/projects/${projectId}/tasks`, { token }),
    ]);
    setProject(p.project);
    setDashboard(d);
    setTasks(t.tasks);
  }, [token, projectId]);

  useEffect(() => {
    setError(null);
    void loadAll().catch((err) => {
      setError(err instanceof ApiError ? err.message : "Failed to load project");
    });
  }, [loadAll]);

  async function createTask(e: FormEvent) {
    e.preventDefault();
    if (!token || !projectId) return;
    setBusy(true);
    try {
      await api(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        token,
        body: JSON.stringify({
          title: taskTitle,
          dueDate: taskDue ? new Date(taskDue).toISOString() : null,
        }),
      });
      setTaskTitle("");
      setTaskDue("");
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create task");
    } finally {
      setBusy(false);
    }
  }

  async function updateTask(task: Task, patch: Partial<Task>) {
    if (!token) return;
    try {
      await api(`/api/tasks/${task.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(patch),
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update task");
    }
  }

  async function deleteTask(task: Task) {
    if (!token || !confirm("Delete this task?")) return;
    try {
      await api(`/api/tasks/${task.id}`, { method: "DELETE", token });
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete task");
    }
  }

  async function addMember(e: FormEvent) {
    e.preventDefault();
    if (!token || !projectId) return;
    setMemberInviteError(null);
    setBusy(true);
    try {
      await api(`/api/projects/${projectId}/members`, {
        method: "POST",
        token,
        body: JSON.stringify({ email: memberEmail }),
      });
      setMemberEmail("");
      await loadAll();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not add member";
      setMemberInviteError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(uid: string) {
    if (!token || !projectId || !confirm("Remove this member?")) return;
    try {
      await api(`/api/projects/${projectId}/members/${uid}`, {
        method: "DELETE",
        token,
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove member");
    }
  }

  const memberOptions = useMemo(() => project?.members ?? [], [project]);

  if (!projectId) return null;

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <Link to="/projects" className="back-link">
            ← Projects
          </Link>
          <h1 className="project-title">{project?.name ?? "…"}</h1>
          {project?.description ? (
            <p className="muted small">{project.description}</p>
          ) : null}
        </div>
        <span className="badge">{project?.yourRole}</span>
      </header>

      {error ? (
        <p className="error banner">
          {error}{" "}
          <button type="button" className="linkish" onClick={() => setError(null)}>
            Dismiss
          </button>
        </p>
      ) : null}

      {dashboard ? (
        <section className="stats-row">
          <div className="stat card">
            <span className="muted small">Total tasks</span>
            <strong>{dashboard.total}</strong>
          </div>
          <div className="stat card">
            <span className="muted small">To do</span>
            <strong>{dashboard.byStatus.TODO}</strong>
          </div>
          <div className="stat card">
            <span className="muted small">In progress</span>
            <strong>{dashboard.byStatus.IN_PROGRESS}</strong>
          </div>
          <div className="stat card">
            <span className="muted small">Done</span>
            <strong>{dashboard.byStatus.DONE}</strong>
          </div>
          <div className={`stat card ${dashboard.overdue > 0 ? "warn" : ""}`}>
            <span className="muted small">Overdue</span>
            <strong>{dashboard.overdue}</strong>
          </div>
        </section>
      ) : null}

      <section className="grid two">
        <div className="card">
          <h2>Tasks</h2>
          <form onSubmit={createTask} className="inline-task">
            <input
              placeholder="New task title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              required
            />
            <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
            <button type="submit" className="btn primary sm" disabled={busy}>
              Add
            </button>
          </form>

          <div className="task-table-wrap">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Due</th>
                  {isAdmin ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    currentUserId={user?.id}
                    isAdmin={isAdmin}
                    members={memberOptions}
                    onStatus={(s) => updateTask(task, { status: s })}
                    onAssignee={(id) => updateTask(task, { assigneeId: id })}
                    onDelete={() => deleteTask(task)}
                  />
                ))}
              </tbody>
            </table>
            {tasks.length === 0 ? <p className="muted small pad">No tasks yet.</p> : null}
          </div>
        </div>

        <div className="card">
          <h2>Team</h2>
          <p className="muted small">
            Admins can invite users by email (they must already have an account).
          </p>
          {isAdmin ? (
            <div className="invite-block">
              <form onSubmit={addMember} className="inline-task">
                <input
                  type="email"
                  placeholder="colleague@email.com"
                  value={memberEmail}
                  onChange={(e) => {
                    setMemberEmail(e.target.value);
                    setMemberInviteError(null);
                  }}
                  required
                  aria-invalid={memberInviteError ? true : undefined}
                  aria-describedby={memberInviteError ? "member-invite-error" : undefined}
                />
                <button type="submit" className="btn secondary sm" disabled={busy}>
                  Invite
                </button>
              </form>
              {memberInviteError ? (
                <p id="member-invite-error" className="error small invite-inline" role="alert">
                  {memberInviteError}
                </p>
              ) : null}
            </div>
          ) : null}
          <ul className="member-list">
            {project?.members.map((m) => (
              <li key={m.userId} className="member-row">
                <div>
                  <strong>{m.user.name}</strong>
                  <span className="muted small">{m.user.email}</span>
                  <span className="badge sm">{m.role}</span>
                </div>
                {isAdmin && m.userId !== user?.id ? (
                  <button
                    type="button"
                    className="btn ghost sm danger"
                    onClick={() => removeMember(m.userId)}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function TaskRow({
  task,
  currentUserId,
  isAdmin,
  members,
  onStatus,
  onAssignee,
  onDelete,
}: {
  task: Task;
  currentUserId?: string;
  isAdmin: boolean;
  members: ProjectDetail["members"];
  onStatus: (s: TaskStatus) => void;
  onAssignee: (id: string | null) => void;
  onDelete: () => void;
}) {
  const canEdit =
    isAdmin ||
    !task.assigneeId ||
    task.assigneeId === currentUserId ||
    task.createdById === currentUserId;

  const dueStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—";
  const overdue =
    task.dueDate &&
    task.status !== "DONE" &&
    new Date(task.dueDate) < new Date(new Date().toDateString());

  return (
    <tr className={overdue ? "overdue-row" : undefined}>
      <td>
        <div className="task-title">{task.title}</div>
        {task.description ? (
          <div className="muted small">{task.description}</div>
        ) : null}
      </td>
      <td>
        <select
          className="select-inline"
          value={task.status}
          disabled={!canEdit}
          onChange={(e) => onStatus(e.target.value as TaskStatus)}
        >
          <option value="TODO">To do</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="DONE">Done</option>
        </select>
      </td>
      <td>
        <select
          className="select-inline"
          value={task.assigneeId ?? ""}
          disabled={!canEdit}
          onChange={(e) => onAssignee(e.target.value || null)}
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.user.name}
            </option>
          ))}
        </select>
      </td>
      <td className={overdue ? "due-overdue" : ""}>{dueStr}</td>
      {isAdmin ? (
        <td>
          <button type="button" className="btn ghost sm danger" onClick={onDelete}>
            Delete
          </button>
        </td>
      ) : null}
    </tr>
  );
}
