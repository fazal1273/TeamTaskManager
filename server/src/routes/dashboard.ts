import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function projectDashboard(req: Request, res: Response) {
  const projectId = req.projectAccess!.projectId;
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [grouped, overdue] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId },
      _count: { _all: true },
    }),
    prisma.task.count({
      where: {
        projectId,
        status: { not: "DONE" },
        dueDate: { lt: startOfToday },
      },
    }),
  ]);

  const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Record<
    string,
    number
  >;
  const total = grouped.reduce((s, g) => s + g._count._all, 0);

  res.json({
    total,
    byStatus: {
      TODO: byStatus.TODO ?? 0,
      IN_PROGRESS: byStatus.IN_PROGRESS ?? 0,
      DONE: byStatus.DONE ?? 0,
    },
    overdue,
  });
}
