import { Router } from "express";
import { ProjectRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getSingleParam, loadProjectMember, requireProjectAdmin } from "../middleware/projectAccess.js";
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
} from "../validation/schemas.js";
import { projectDashboard } from "./dashboard.js";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

projectsRouter.get("/", async (req, res) => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.user!.id },
    include: {
      project: {
        include: {
          _count: { select: { tasks: true, members: true } },
        },
      },
    },
    orderBy: { project: { updatedAt: "desc" } },
  });
  res.json({
    projects: memberships.map((m) => ({
      id: m.project.id,
      name: m.project.name,
      description: m.project.description,
      role: m.role,
      taskCount: m.project._count.tasks,
      memberCount: m.project._count.members,
      updatedAt: m.project.updatedAt,
    })),
  });
});

projectsRouter.post("/", async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, description } = parsed.data;
  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: { name, description: description ?? undefined },
    });
    await tx.projectMember.create({
      data: {
        projectId: p.id,
        userId: req.user!.id,
        role: ProjectRole.ADMIN,
      },
    });
    return p;
  });
  res.status(201).json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      role: ProjectRole.ADMIN,
    },
  });
});

projectsRouter.get("/:projectId/dashboard", loadProjectMember, projectDashboard);

projectsRouter.get("/:projectId", loadProjectMember, async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.projectAccess!.projectId },
    include: {
      members: {
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      yourRole: req.projectAccess!.role,
      members: project.members.map((m) => ({
        userId: m.userId,
        role: m.role,
        user: m.user,
      })),
    },
  });
});

projectsRouter.patch("/:projectId", loadProjectMember, requireProjectAdmin, async (req, res) => {
  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const project = await prisma.project.update({
    where: { id: req.projectAccess!.projectId },
    data,
  });
  res.json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
    },
  });
});

projectsRouter.delete("/:projectId", loadProjectMember, requireProjectAdmin, async (req, res) => {
  await prisma.project.delete({ where: { id: req.projectAccess!.projectId } });
  res.status(204).send();
});

projectsRouter.post("/:projectId/members", loadProjectMember, requireProjectAdmin, async (req, res) => {
  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, role } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    res.status(404).json({ error: "No user with that email" });
    return;
  }
  const existing = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: req.projectAccess!.projectId, userId: user.id },
    },
  });
  if (existing) {
    res.status(409).json({ error: "User is already a member" });
    return;
  }
  const member = await prisma.projectMember.create({
    data: {
      projectId: req.projectAccess!.projectId,
      userId: user.id,
      role: role === ProjectRole.ADMIN ? ProjectRole.ADMIN : ProjectRole.MEMBER,
    },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  res.status(201).json({
    member: {
      userId: member.userId,
      role: member.role,
      user: member.user,
    },
  });
});

projectsRouter.delete(
  "/:projectId/members/:userId",
  loadProjectMember,
  requireProjectAdmin,
  async (req, res) => {
    const userId = getSingleParam(req.params.userId);
    if (!userId) {
      res.status(400).json({ error: "Missing user id" });
      return;
    }
    if (userId === req.user!.id) {
      res.status(400).json({ error: "Cannot remove yourself; transfer admin or delete project" });
      return;
    }
    await prisma.projectMember.deleteMany({
      where: { projectId: req.projectAccess!.projectId, userId },
    });
    res.status(204).send();
  }
);
