import {
    ConflictException,
    NotFoundException,
} from '@nestjs/common';

import { WorkspacesService } from './workspaces.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WorkspacesService', () => {
    let service: WorkspacesService;

    const prisma = {
        workspace: {
            create: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        workspaceMember: {
            findUnique: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
        project: {
            count: jest.fn(),
        },
        $transaction: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        service = new WorkspacesService(
            prisma as unknown as PrismaService,
        );
    });

    describe('create', () => {
        it('should create a workspace with the creator as a member', async () => {
            const workspace = {
                id: 'workspace-1',
                name: 'Test workspace',
            };

            prisma.workspace.create.mockResolvedValue(workspace);

            const result = await service.create(
                'Test workspace',
                'user-1',
            );

            expect(result).toEqual(workspace);

            expect(prisma.workspace.create).toHaveBeenCalledWith({
                data: {
                    name: 'Test workspace',
                    members: {
                        create: {
                            userId: 'user-1',
                        },
                    },
                },
            });
        });
    });

    describe('findAll', () => {
        it('should return workspaces where user is a member', async () => {
            const workspaces = [
                {
                    id: 'workspace-1',
                    name: 'Workspace 1',
                },
            ];

            prisma.workspace.findMany.mockResolvedValue(workspaces);

            const result = await service.findAll('user-1');

            expect(result).toEqual(workspaces);

            expect(prisma.workspace.findMany).toHaveBeenCalledWith({
                where: {
                    members: {
                        some: {
                            userId: 'user-1',
                        },
                    },
                },
                include: {
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    nickName: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            });
        });
    });

    describe('update', () => {
        it('should update workspace name when user is a member', async () => {
            prisma.workspaceMember.findUnique.mockResolvedValue({
                id: 'member-1',
                userId: 'user-1',
                workspaceId: 'workspace-1',
            });

            const updatedWorkspace = {
                id: 'workspace-1',
                name: 'New name',
            };

            prisma.workspace.update.mockResolvedValue(updatedWorkspace);

            const result = await service.update(
                'workspace-1',
                'user-1',
                'New name',
            );

            expect(result).toEqual(updatedWorkspace);

            expect(prisma.workspace.update).toHaveBeenCalledWith({
                where: {
                    id: 'workspace-1',
                },
                data: {
                    name: 'New name',
                },
            });
        });

        it('should throw NotFoundException when user is not a member', async () => {
            prisma.workspaceMember.findUnique.mockResolvedValue(null);

            await expect(
                service.update(
                    'workspace-1',
                    'user-1',
                    'New name',
                ),
            ).rejects.toThrow(
                new NotFoundException('Workspace not found'),
            );

            expect(prisma.workspace.update).not.toHaveBeenCalled();
        });
    });

    describe('addMember', () => {
        it('should throw when current user is not a member', async () => {
            prisma.workspaceMember.findUnique.mockResolvedValue(null);

            await expect(
                service.addMember(
                    'workspace-1',
                    'current-user',
                    'test@example.com',
                ),
            ).rejects.toThrow(
                new NotFoundException('Workspace not found'),
            );

            expect(prisma.user.findUnique).not.toHaveBeenCalled();
        });

        it('should throw when user does not exist', async () => {
            prisma.workspaceMember.findUnique.mockResolvedValue({
                id: 'member-1',
            });

            prisma.user.findUnique.mockResolvedValue(null);

            await expect(
                service.addMember(
                    'workspace-1',
                    'current-user',
                    'test@example.com',
                ),
            ).rejects.toThrow(
                new NotFoundException('User not found'),
            );
        });

        it('should throw when user is already a member', async () => {
            prisma.workspaceMember.findUnique
                .mockResolvedValueOnce({
                    id: 'current-member',
                })
                .mockResolvedValueOnce({
                    id: 'existing-member',
                });

            prisma.user.findUnique.mockResolvedValue({
                id: 'user-2',
                email: 'test@example.com',
            });

            await expect(
                service.addMember(
                    'workspace-1',
                    'current-user',
                    'test@example.com',
                ),
            ).rejects.toThrow(
                new ConflictException(
                    'User is already a member of this workspace',
                ),
            );

            expect(prisma.workspaceMember.create).not.toHaveBeenCalled();
        });

        it('should add user to workspace', async () => {
            prisma.workspaceMember.findUnique
                .mockResolvedValueOnce({
                    id: 'current-member',
                })
                .mockResolvedValueOnce(null);

            prisma.user.findUnique.mockResolvedValue({
                id: 'user-2',
                email: 'test@example.com',
            });

            const member = {
                id: 'member-2',
                userId: 'user-2',
                workspaceId: 'workspace-1',
            };

            prisma.workspaceMember.create.mockResolvedValue(member);

            const result = await service.addMember(
                'workspace-1',
                'current-user',
                'test@example.com',
            );

            expect(result).toEqual(member);

            expect(prisma.workspaceMember.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-2',
                    workspaceId: 'workspace-1',
                },
            });
        });
    });

    describe('leave', () => {
        it('should throw when user is not a member', async () => {
            const tx = {
                workspaceMember: {
                    findUnique: jest.fn().mockResolvedValue(null),
                },
                workspace: {
                    delete: jest.fn(),
                },
            };

            prisma.$transaction.mockImplementation(
                async (callback) => callback(tx),
            );

            await expect(
                service.leave('workspace-1', 'user-1'),
            ).rejects.toThrow(
                new NotFoundException(
                    'You are not a member of this workspace',
                ),
            );
        });

        it('should delete workspace when last member leaves and there are no projects', async () => {
            const tx = {
                workspaceMember: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'member-1',
                    }),
                    count: jest.fn().mockResolvedValue(1),
                },
                project: {
                    count: jest.fn().mockResolvedValue(0),
                },
                workspace: {
                    delete: jest.fn().mockResolvedValue({
                        id: 'workspace-1',
                    }),
                },
            };

            prisma.$transaction.mockImplementation(
                async (callback) => callback(tx),
            );

            const result = await service.leave(
                'workspace-1',
                'user-1',
            );

            expect(result).toEqual({
                message: 'You left and the workspace was deleted',
            });

            expect(tx.workspace.delete).toHaveBeenCalledWith({
                where: {
                    id: 'workspace-1',
                },
            });
        });

        it('should not allow the last member to leave when projects exist', async () => {
            const tx = {
                workspaceMember: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'member-1',
                    }),
                    count: jest.fn().mockResolvedValue(1),
                },
                project: {
                    count: jest.fn().mockResolvedValue(2),
                },
                workspace: {
                    delete: jest.fn(),
                },
            };

            prisma.$transaction.mockImplementation(
                async (callback) => callback(tx),
            );

            await expect(
                service.leave('workspace-1', 'user-1'),
            ).rejects.toThrow(
                new ConflictException(
                    'You cannot leave a workspace that contains projects',
                ),
            );

            expect(tx.workspace.delete).not.toHaveBeenCalled();
        });

        it('should remove member when other members remain', async () => {
            const tx = {
                workspaceMember: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'member-1',
                    }),
                    count: jest.fn().mockResolvedValue(2),
                    delete: jest.fn().mockResolvedValue({
                        id: 'member-1',
                    }),
                },
                project: {
                    count: jest.fn(),
                },
                workspace: {
                    delete: jest.fn(),
                },
            };

            prisma.$transaction.mockImplementation(
                async (callback) => callback(tx),
            );

            const result = await service.leave(
                'workspace-1',
                'user-1',
            );

            expect(result).toEqual({
                message: 'You left the workspace',
            });

            expect(tx.workspaceMember.delete).toHaveBeenCalledWith({
                where: {
                    id: 'member-1',
                },
            });

            expect(tx.workspace.delete).not.toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('should throw when user is not a member', async () => {
            prisma.workspaceMember.findUnique.mockResolvedValue(null);

            await expect(
                service.delete(
                    'workspace-1',
                    'user-1',
                ),
            ).rejects.toThrow(
                new NotFoundException('Workspace not found'),
            );

            expect(prisma.workspace.delete).not.toHaveBeenCalled();
        });

        it('should delete workspace when user is a member', async () => {
            prisma.workspaceMember.findUnique.mockResolvedValue({
                id: 'member-1',
            });

            const deletedWorkspace = {
                id: 'workspace-1',
                name: 'Workspace',
            };

            prisma.workspace.delete.mockResolvedValue(
                deletedWorkspace,
            );

            const result = await service.delete(
                'workspace-1',
                'user-1',
            );

            expect(result).toEqual(deletedWorkspace);

            expect(prisma.workspace.delete).toHaveBeenCalledWith({
                where: {
                    id: 'workspace-1',
                },
            });
        });
    });
});