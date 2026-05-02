export type User = {
  id: string;
  email: string;
  name: string;
};

export type ProjectRole = "ADMIN" | "MEMBER";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  role: ProjectRole;
  taskCount: number;
  memberCount: number;
  updatedAt: string;
};

export type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  yourRole: ProjectRole;
  members: {
    userId: string;
    role: ProjectRole;
    user: User;
  }[];
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  assigneeId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignee: User | null;
  createdBy: User;
};

export type DashboardSummary = {
  total: number;
  byStatus: Record<TaskStatus, number>;
  overdue: number;
};
