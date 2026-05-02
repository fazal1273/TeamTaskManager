# Team Task Manager (full-stack)

Web app for **projects**, **teams**, and **tasks** with **JWT authentication** and **per-project RBAC** (**Admin** vs **Member**). Built for coursework-style submission: REST API, **SQLite**  + Prisma, React SPA, and deployable on **Railway**.


## Stack

| Layer    | Choice                                      |
| --------- | ------------------------------------------- |
| API       | Express (REST)                              |
| Database  | SQLite (local file; Prisma does not support H2) |
| ORM       | Prisma                                      |
| Auth      | bcrypt + JWT                                |
| Validation| Zod                                         |

## API overview

| Method | Path | Notes |
| ------ | ---- | ----- |
| POST | `/api/auth/register` | Body: `email`, `password`, `name` |
| POST | `/api/auth/login` | Body: `email`, `password` |
| GET | `/api/auth/me` | Bearer token |
| GET | `/api/projects` | List memberships |
| POST | `/api/projects` | Create (creator = admin) |
| GET | `/api/projects/:projectId` | Detail + members |
| PATCH | `/api/projects/:projectId` | Admin |
| DELETE | `/api/projects/:projectId` | Admin |
| POST | `/api/projects/:projectId/members` | Admin; body `email`, optional `role` |
| DELETE | `/api/projects/:projectId/members/:userId` | Admin |
| GET | `/api/projects/:projectId/dashboard` | Stats |
| GET | `/api/projects/:projectId/tasks` | List tasks |
| POST | `/api/projects/:projectId/tasks` | Create task |
| PATCH | `/api/tasks/:taskId` | Update task (RBAC rules above) |
| DELETE | `/api/tasks/:taskId` | Admin only |

Send `Authorization: Bearer <token>` for protected routes.

