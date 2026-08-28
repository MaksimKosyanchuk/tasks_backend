-- CreateTable
CREATE TABLE "TaskStatusHistory" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "oldStatus" "TaskStatus" NOT NULL,
    "newStatus" "TaskStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_workspaceId_createdAt_id_idx" ON "Project"("workspaceId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Task_projectId_createdAt_id_idx" ON "Task"("projectId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Task_projectId_status_createdAt_id_idx" ON "Task"("projectId", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Task_projectId_priority_createdAt_id_idx" ON "Task"("projectId", "priority", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Task_projectId_assigneeId_createdAt_id_idx" ON "Task"("projectId", "assigneeId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Comment_taskId_createdAt_id_idx" ON "Comment"("taskId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "TaskStatusHistory_taskId_createdAt_id_idx" ON "TaskStatusHistory"("taskId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "TaskStatusHistory_changedById_idx" ON "TaskStatusHistory"("changedById");

-- AddForeignKey
ALTER TABLE "TaskStatusHistory" ADD CONSTRAINT "TaskStatusHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskStatusHistory" ADD CONSTRAINT "TaskStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;