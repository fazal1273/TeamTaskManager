import type { NextFunction, Request, Response } from "express";
import { ProjectRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type ProjectAccess = {
  projectId: string;
  role: ProjectRole;
};

export function getSingleParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

declare global {
  namespace Express {
    interface Request {
      projectAccess?: ProjectAccess;
    }
  }
}

export async function loadProjectMember(req: Request, res: Response, next: NextFunction) {
  const projectId = getSingleParam(req.params.projectId) ?? getSingleParam(req.params.id);
  if (!projectId || !req.user) {
    res.status(400).json({ error: "Missing project id" });
    return;
  }
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId: req.user.id },
    },
  });
  if (!membership) {
    res.status(403).json({ error: "You are not a member of this project" });
    return;
  }
  req.projectAccess = { projectId, role: membership.role };
  next();
}

export function requireProjectAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.projectAccess?.role !== ProjectRole.ADMIN) {
    res.status(403).json({ error: "Admin role required" });
    return;
  }
  next();
}
