import { Router } from "express";
import { ProjectRole, type Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { loadProjectMember } from "../middleware/projectAccess.js";
import { createTaskSchema, updateTaskSchema } from "../validation/schemas.js";

export const tasksRouter = Router({ mergeParams: true });
tasksRouter.use(requireAuth);
tasksRouter.use(loadProjectMember);

tasksRouter.get("/", async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { projectId: req.projectAccess!.projectId },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      assignee: { select: { id: true, email: true, name: true } },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });
  res.json({ tasks });
});

tasksRouter.post("/", async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;
  if (body.assigneeId) {
    const m = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: req.projectAccess!.projectId, userId: body.assigneeId },
      },
    });
    if (!m) {
      res.status(400).json({ error: "Assignee must be a project member" });
      return;
    }
  }
  const task = await prisma.task.create({
    data: {
      projectId: req.projectAccess!.projectId,
      title: body.title,
      description: body.description ?? undefined,
      status: body.status,
      dueDate: body.dueDate ?? undefined,
      assigneeId: body.assigneeId ?? undefined,
      createdById: req.user!.id,
    },
    include: {
      assignee: { select: { id: true, email: true, name: true } },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });
  res.status(201).json({ task });
});

export const taskByIdRouter = Router();
taskByIdRouter.use(requireAuth);

taskByIdRouter.patch("/:taskId", async (req, res) => {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: task.projectId, userId: req.user!.id },
    },
  });
  if (!membership) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const isAdmin = membership.role === ProjectRole.ADMIN;
  if (!isAdmin && task.assigneeId && task.assigneeId !== req.user!.id) {
    res.status(403).json({ error: "Only the assignee or an admin can update this task" });
    return;
  }
  if (body.assigneeId) {
    const m = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId: body.assigneeId },
      },
    });
    if (!m) {
      res.status(400).json({ error: "Assignee must be a project member" });
      return;
    }
  }
  const data: Prisma.TaskUncheckedUpdateInput = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.status !== undefined) data.status = body.status;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate;
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId;
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const updated = await prisma.task.update({
    where: { id: task.id },
    data,
    include: {
      assignee: { select: { id: true, email: true, name: true } },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });
  res.json({ task: updated });
});

taskByIdRouter.delete("/:taskId", async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: task.projectId, userId: req.user!.id },
    },
  });
  if (!membership || membership.role !== ProjectRole.ADMIN) {
    res.status(403).json({ error: "Admin role required to delete tasks" });
    return;
  }
  await prisma.task.delete({ where: { id: task.id } });
  res.status(204).send();
});
