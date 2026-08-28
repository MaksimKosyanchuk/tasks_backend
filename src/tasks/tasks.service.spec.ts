import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';

import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaskRealtimeGateway } from './task-realtime.gateway';

describe('TasksService', () => {
    let service: TasksService;

    const prismaMock = {
        projectMember: {
            findUnique: jest.fn(),
        },

        workspaceMember: {
            findUnique: jest.fn(),
        },

        project: {
            findFirst: jest.fn(),
        },

        user: {
            findUnique: jest.fn(),
        },

        task: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },

        $transaction: jest.fn(),
    };

    const realtimeGatewayMock = {
        emitTaskCreated: jest.fn(),
        emitTaskChanged: jest.fn(),
        emitTaskDeleted: jest.fn(),
        emitHistoryCreated: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TasksService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
                {
                    provide: TaskRealtimeGateway,
                    useValue: realtimeGatewayMock,
                },
            ],
        }).compile();

        service = module.get<TasksService>(TasksService);

        jest.clearAllMocks();

        prismaMock.$transaction.mockImplementation(
            (callback: (tx: typeof prismaMock) => unknown) =>
                callback(prismaMock),
        );
    });

    describe('create', () => {
        const dto = {
            title: 'Test task',
            description: 'Test description',
            priority: 'HIGH',
            dueDate: '2026-09-01',
            assigneeId: 'user-2',
        };

        it('should create task for project owner', async () => {
            /*
             * Первый findUnique:
             * проверка текущего пользователя.
             *
             * Второй findUnique:
             * проверка assignee как project member.
             */
            prismaMock.projectMember.findUnique
                .mockResolvedValueOnce({
                    userId: 'user-1',
                    projectId: 'project-1',
                    role: 'OWNER',
                })
                .mockResolvedValueOnce({
                    userId: 'user-2',
                    projectId: 'project-1',
                    role: 'MEMBER',
                });

            prismaMock.project.findFirst.mockResolvedValue({
                id: 'project-1',
                workspaceId: 'workspace-1',
            });

            prismaMock.user.findUnique.mockResolvedValue({
                id: 'user-2',
            });

            prismaMock.workspaceMember.findUnique.mockResolvedValue({
                userId: 'user-2',
                workspaceId: 'workspace-1',
            });

            const task = {
                id: 'task-1',
                title: 'Test task',
                projectId: 'project-1',
                assigneeId: 'user-2',
            };

            prismaMock.task.create.mockResolvedValue(task);

            const result = await service.create(
                'workspace-1',
                'project-1',
                'user-1',
                dto as any,
            );

            expect(result).toEqual(task);

            expect(prismaMock.task.create).toHaveBeenCalled();

            expect(realtimeGatewayMock.emitTaskCreated).toHaveBeenCalledWith(
                'project-1',
                task,
            );
        });

        it('should forbid MEMBER from creating task', async () => {
            prismaMock.projectMember.findUnique.mockResolvedValue({
                userId: 'user-1',
                projectId: 'project-1',
                role: 'MEMBER',
            });

            await expect(
                service.create(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    dto as any,
                ),
            ).rejects.toThrow(
                new ForbiddenException('Only project owner can manage tasks'),
            );

            expect(prismaMock.task.create).not.toHaveBeenCalled();
        });

        it('should reject assignee who is not a project member', async () => {
            /*
             * Текущий пользователь — OWNER.
             */
            prismaMock.projectMember.findUnique
                .mockResolvedValueOnce({
                    userId: 'user-1',
                    projectId: 'project-1',
                    role: 'OWNER',
                })
                /*
                 * Но assignee не является member проекта.
                 */
                .mockResolvedValueOnce(null);

            prismaMock.project.findFirst.mockResolvedValue({
                id: 'project-1',
                workspaceId: 'workspace-1',
            });

            prismaMock.user.findUnique.mockResolvedValue({
                id: 'user-2',
            });

            prismaMock.workspaceMember.findUnique.mockResolvedValue({
                userId: 'user-2',
                workspaceId: 'workspace-1',
            });

            await expect(
                service.create(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    dto as any,
                ),
            ).rejects.toThrow(
                new ConflictException(
                    'Assignee is not a member of this project',
                ),
            );

            expect(prismaMock.task.create).not.toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('should update task for project owner', async () => {
            prismaMock.projectMember.findUnique.mockResolvedValue({
                userId: 'user-1',
                projectId: 'project-1',
                role: 'OWNER',
            });

            prismaMock.project.findFirst.mockResolvedValue({
                id: 'project-1',
                workspaceId: 'workspace-1',
            });

            prismaMock.task.findFirst.mockResolvedValue({
                id: 'task-1',
                projectId: 'project-1',
                status: 'TODO',
            });

            const updatedTask = {
                id: 'task-1',
                title: 'Updated task',
                status: 'TODO',
                projectId: 'project-1',
            };

            prismaMock.task.update.mockResolvedValue(updatedTask);

            const result = await service.update(
                'workspace-1',
                'project-1',
                'task-1',
                'user-1',
                {
                    title: 'Updated task',
                },
            );

            expect(result).toEqual(updatedTask);

            expect(prismaMock.task.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        id: 'task-1',
                    },
                }),
            );

            expect(realtimeGatewayMock.emitTaskChanged).toHaveBeenCalledWith(
                'project-1',
                updatedTask,
            );
        });

        it('should forbid MEMBER from updating task', async () => {
            prismaMock.projectMember.findUnique.mockResolvedValue({
                userId: 'user-1',
                projectId: 'project-1',
                role: 'MEMBER',
            });

            await expect(
                service.update('workspace-1', 'project-1', 'task-1', 'user-1', {
                    title: 'Updated',
                } as any),
            ).rejects.toThrow('Only project owner can manage tasks');

            expect(prismaMock.task.update).not.toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('should delete task for project owner', async () => {
            prismaMock.projectMember.findUnique.mockResolvedValue({
                userId: 'user-1',
                projectId: 'project-1',
                role: 'OWNER',
            });

            prismaMock.project.findFirst.mockResolvedValue({
                id: 'project-1',
                workspaceId: 'workspace-1',
            });

            prismaMock.task.findFirst.mockResolvedValue({
                id: 'task-1',
                projectId: 'project-1',
            });

            const deletedTask = {
                id: 'task-1',
                title: 'Deleted task',
                projectId: 'project-1',
            };

            prismaMock.task.delete.mockResolvedValue(deletedTask);

            const result = await service.delete(
                'workspace-1',
                'project-1',
                'task-1',
                'user-1',
            );

            expect(result).toEqual(deletedTask);

            expect(prismaMock.task.delete).toHaveBeenCalledWith({
                where: {
                    id: 'task-1',
                },
            });

            expect(realtimeGatewayMock.emitTaskDeleted).toHaveBeenCalledWith(
                'project-1',
                'task-1',
            );
        });

        it('should forbid MEMBER from deleting task', async () => {
            prismaMock.projectMember.findUnique.mockResolvedValue({
                userId: 'user-1',
                projectId: 'project-1',
                role: 'MEMBER',
            });

            await expect(
                service.delete('workspace-1', 'project-1', 'task-1', 'user-1'),
            ).rejects.toThrow('Only project owner can manage tasks');

            expect(prismaMock.task.delete).not.toHaveBeenCalled();
        });
    });

    describe('list', () => {
        it('should reject user who is not a project member', async () => {
            prismaMock.projectMember.findUnique.mockResolvedValue(null);

            await expect(
                service.list('workspace-1', 'project-1', 'user-1'),
            ).rejects.toThrow('Project not found');

            expect(prismaMock.task.findMany).not.toHaveBeenCalled();
        });

        it('should return paginated tasks for project member', async () => {
            prismaMock.projectMember.findUnique.mockResolvedValue({
                userId: 'user-1',
                projectId: 'project-1',
                role: 'MEMBER',
            });

            const tasks = [
                {
                    id: 'task-1',
                    title: 'Task 1',
                },
                {
                    id: 'task-2',
                    title: 'Task 2',
                },
            ];

            prismaMock.task.findMany.mockResolvedValue(tasks);

            const result = await service.list(
                'workspace-1',
                'project-1',
                'user-1',
                undefined,
                20,
            );

            expect(result).toEqual({
                items: tasks,
                nextCursor: null,
                hasMore: false,
            });
        });
    });
});
