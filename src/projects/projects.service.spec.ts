import {
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';

import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProjectsService', () => {
    let service: ProjectsService;

    const prisma = {
        $transaction: jest.fn(),

        workspaceMember: {
            findUnique: jest.fn(),
        },

        projectMember: {
            findUnique: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },

        project: {
            create: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },

        user: {
            findUnique: jest.fn(),
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();

        service = new ProjectsService(prisma as unknown as PrismaService);
    });

    const setupTransaction = (tx: unknown) => {
        prisma.$transaction.mockImplementation((callback: unknown) => {
            if (typeof callback !== 'function') {
                throw new Error('Expected transaction callback');
            }

            const transactionCallback = callback as (
                transaction: unknown,
            ) => unknown;

            return transactionCallback(tx);
        });
    };

    describe('create', () => {
        it('should throw when user is not a workspace member', async () => {
            const tx = {
                workspaceMember: {
                    findUnique: jest.fn().mockResolvedValue(null),
                },
            };

            setupTransaction(tx);

            await expect(
                service.create('workspace-1', 'user-1', 'Project'),
            ).rejects.toThrow(new NotFoundException('Workspace not found'));
        });

        it('should create project and assign owner', async () => {
            const project = {
                id: 'project-1',
                name: 'Project',
                description: 'Description',
                workspaceId: 'workspace-1',
            };

            const resultProject = {
                ...project,
                members: [
                    {
                        userId: 'user-1',
                        role: 'OWNER',
                    },
                ],
            };

            const tx = {
                workspaceMember: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'workspace-member-1',
                    }),
                },

                project: {
                    create: jest.fn().mockResolvedValue(project),
                    findUnique: jest.fn().mockResolvedValue(resultProject),
                },

                projectMember: {
                    create: jest.fn().mockResolvedValue({
                        id: 'project-member-1',
                    }),
                },
            };

            setupTransaction(tx);

            const result = await service.create(
                'workspace-1',
                'user-1',
                'Project',
                'Description',
            );

            expect(result).toEqual(resultProject);

            expect(tx.project.create).toHaveBeenCalledWith({
                data: {
                    name: 'Project',
                    description: 'Description',
                    workspaceId: 'workspace-1',
                },
            });

            expect(tx.projectMember.create).toHaveBeenCalledWith({
                data: {
                    projectId: 'project-1',
                    userId: 'user-1',
                    role: 'OWNER',
                },
            });
        });
    });

    describe('findAll', () => {
        it('should throw when user is not a workspace member', async () => {
            prisma.workspaceMember.findUnique.mockResolvedValue(null);

            await expect(
                service.findAll('workspace-1', 'user-1'),
            ).rejects.toThrow(new NotFoundException('Workspace not found'));

            expect(prisma.project.findMany).not.toHaveBeenCalled();
        });

        it('should return projects available to the user', async () => {
            prisma.workspaceMember.findUnique.mockResolvedValue({
                id: 'workspace-member-1',
            });

            const projects = [
                {
                    id: 'project-1',
                    name: 'Project 1',
                },
            ];

            prisma.project.findMany.mockResolvedValue(projects);

            const result = await service.findAll('workspace-1', 'user-1');

            expect(result).toEqual(projects);

            expect(prisma.project.findMany).toHaveBeenCalled();
        });
    });

    describe('addMember', () => {
        it('should reject non-owner', async () => {
            const tx = {
                projectMember: {
                    findUnique: jest.fn().mockResolvedValue({
                        role: 'MEMBER',
                    }),
                },
            };

            setupTransaction(tx);

            await expect(
                service.addMember(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    'test@example.com',
                ),
            ).rejects.toThrow(
                new ForbiddenException('Only project owner can add members'),
            );
        });

        it('should throw when project does not exist', async () => {
            const tx = {
                projectMember: {
                    findUnique: jest.fn().mockResolvedValue({
                        role: 'OWNER',
                    }),
                },

                project: {
                    findFirst: jest.fn().mockResolvedValue(null),
                },
            };

            setupTransaction(tx);

            await expect(
                service.addMember(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    'test@example.com',
                ),
            ).rejects.toThrow(new NotFoundException('Project not found'));
        });

        it('should throw when user does not exist', async () => {
            const tx = {
                projectMember: {
                    findUnique: jest.fn().mockResolvedValue({
                        role: 'OWNER',
                    }),
                },

                project: {
                    findFirst: jest.fn().mockResolvedValue({
                        id: 'project-1',
                    }),
                },

                user: {
                    findUnique: jest.fn().mockResolvedValue(null),
                },
            };

            setupTransaction(tx);

            await expect(
                service.addMember(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    'test@example.com',
                ),
            ).rejects.toThrow(new NotFoundException('User not found'));
        });

        it('should reject user who is not in workspace', async () => {
            const tx = {
                projectMember: {
                    findUnique: jest.fn().mockResolvedValue({
                        role: 'OWNER',
                    }),
                },

                project: {
                    findFirst: jest.fn().mockResolvedValue({
                        id: 'project-1',
                    }),
                },

                user: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'user-2',
                    }),
                },

                workspaceMember: {
                    findUnique: jest.fn().mockResolvedValue(null),
                },
            };

            setupTransaction(tx);

            await expect(
                service.addMember(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    'test@example.com',
                ),
            ).rejects.toThrow(
                new ConflictException('User is not a member of this workspace'),
            );
        });

        it('should reject existing project member', async () => {
            const tx = {
                projectMember: {
                    findUnique: jest
                        .fn()
                        .mockResolvedValueOnce({
                            role: 'OWNER',
                        })
                        .mockResolvedValueOnce({
                            id: 'existing-member',
                        }),
                },

                project: {
                    findFirst: jest.fn().mockResolvedValue({
                        id: 'project-1',
                    }),
                },

                user: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'user-2',
                    }),
                },

                workspaceMember: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'workspace-member',
                    }),
                },
            };

            setupTransaction(tx);

            await expect(
                service.addMember(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    'test@example.com',
                ),
            ).rejects.toThrow(
                new ConflictException(
                    'User is already a member of this project',
                ),
            );
        });

        it('should add project member', async () => {
            const member = {
                id: 'project-member-2',
                userId: 'user-2',
                projectId: 'project-1',
                role: 'MEMBER',
            };

            const tx = {
                projectMember: {
                    findUnique: jest
                        .fn()
                        .mockResolvedValueOnce({
                            role: 'OWNER',
                        })
                        .mockResolvedValueOnce(null),

                    create: jest.fn().mockResolvedValue(member),
                },

                project: {
                    findFirst: jest.fn().mockResolvedValue({
                        id: 'project-1',
                    }),
                },

                user: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'user-2',
                    }),
                },

                workspaceMember: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'workspace-member',
                    }),
                },
            };

            setupTransaction(tx);

            const result = await service.addMember(
                'workspace-1',
                'project-1',
                'user-1',
                'test@example.com',
            );

            expect(result).toEqual(member);

            expect(tx.projectMember.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-2',
                    projectId: 'project-1',
                    role: 'MEMBER',
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            nickName: true,
                            email: true,
                        },
                    },
                },
            });
        });
    });

    describe('updateMemberRole', () => {
        it('should reject non-owner', async () => {
            const tx = {
                projectMember: {
                    findUnique: jest.fn().mockResolvedValue({
                        role: 'MEMBER',
                    }),
                },
            };

            setupTransaction(tx);

            await expect(
                service.updateMemberRole(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    'user-2',
                    'MEMBER',
                ),
            ).rejects.toThrow(
                new ForbiddenException('Only project owner can change roles'),
            );
        });

        it('should throw when project does not exist', async () => {
            const tx = {
                projectMember: {
                    findUnique: jest.fn().mockResolvedValue({
                        role: 'OWNER',
                    }),
                },

                project: {
                    findFirst: jest.fn().mockResolvedValue(null),
                },
            };

            setupTransaction(tx);

            await expect(
                service.updateMemberRole(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    'user-2',
                    'MEMBER',
                ),
            ).rejects.toThrow(new NotFoundException('Project not found'));
        });

        it('should throw when target member does not exist', async () => {
            const tx = {
                projectMember: {
                    findUnique: jest
                        .fn()
                        .mockResolvedValueOnce({
                            role: 'OWNER',
                        })
                        .mockResolvedValueOnce(null),
                },

                project: {
                    findFirst: jest.fn().mockResolvedValue({
                        id: 'project-1',
                    }),
                },
            };

            setupTransaction(tx);

            await expect(
                service.updateMemberRole(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    'user-2',
                    'MEMBER',
                ),
            ).rejects.toThrow(
                new NotFoundException('Project member not found'),
            );
        });

        it('should not remove the last owner role', async () => {
            const tx = {
                projectMember: {
                    findUnique: jest
                        .fn()
                        .mockResolvedValueOnce({
                            role: 'OWNER',
                        })
                        .mockResolvedValueOnce({
                            id: 'member-2',
                            role: 'OWNER',
                        }),

                    count: jest.fn().mockResolvedValue(1),

                    update: jest.fn(),
                },

                project: {
                    findFirst: jest.fn().mockResolvedValue({
                        id: 'project-1',
                    }),
                },
            };

            setupTransaction(tx);

            await expect(
                service.updateMemberRole(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    'user-2',
                    'MEMBER',
                ),
            ).rejects.toThrow(
                new ConflictException('Project must have at least one owner'),
            );

            expect(tx.projectMember.update).not.toHaveBeenCalled();
        });

        it('should update member role', async () => {
            const updatedMember = {
                id: 'member-2',
                role: 'OWNER',
            };

            const tx = {
                projectMember: {
                    findUnique: jest
                        .fn()
                        .mockResolvedValueOnce({
                            role: 'OWNER',
                        })
                        .mockResolvedValueOnce({
                            id: 'member-2',
                            role: 'MEMBER',
                        }),

                    update: jest.fn().mockResolvedValue(updatedMember),
                },

                project: {
                    findFirst: jest.fn().mockResolvedValue({
                        id: 'project-1',
                    }),
                },
            };

            setupTransaction(tx);

            const result = await service.updateMemberRole(
                'workspace-1',
                'project-1',
                'user-1',
                'user-2',
                'OWNER',
            );

            expect(result).toEqual(updatedMember);

            expect(tx.projectMember.update).toHaveBeenCalledWith({
                where: {
                    id: 'member-2',
                },
                data: {
                    role: 'OWNER',
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            nickName: true,
                            email: true,
                        },
                    },
                },
            });
        });
    });

    describe('removeMember', () => {
        it('should reject non-owner', async () => {
            const tx = {
                projectMember: {
                    findUnique: jest.fn().mockResolvedValue({
                        role: 'MEMBER',
                    }),
                },
            };

            setupTransaction(tx);

            await expect(
                service.removeMember(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    'user-2',
                ),
            ).rejects.toThrow(
                new ForbiddenException('Only project owner can remove members'),
            );
        });

        it('should throw when target member does not exist', async () => {
            const tx = {
                projectMember: {
                    findUnique: jest
                        .fn()
                        .mockResolvedValueOnce({
                            role: 'OWNER',
                        })
                        .mockResolvedValueOnce(null),
                },

                project: {
                    findFirst: jest.fn().mockResolvedValue({
                        id: 'project-1',
                    }),
                },
            };

            setupTransaction(tx);

            await expect(
                service.removeMember(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    'user-2',
                ),
            ).rejects.toThrow(
                new NotFoundException('Project member not found'),
            );
        });

        it('should not remove the last owner', async () => {
            const tx = {
                projectMember: {
                    findUnique: jest
                        .fn()
                        .mockResolvedValueOnce({
                            role: 'OWNER',
                        })
                        .mockResolvedValueOnce({
                            id: 'member-2',
                            role: 'OWNER',
                        }),

                    count: jest.fn().mockResolvedValue(1),

                    delete: jest.fn(),
                },

                project: {
                    findFirst: jest.fn().mockResolvedValue({
                        id: 'project-1',
                    }),
                },
            };

            setupTransaction(tx);

            await expect(
                service.removeMember(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    'user-2',
                ),
            ).rejects.toThrow(
                new ConflictException('Project must have at least one owner'),
            );

            expect(tx.projectMember.delete).not.toHaveBeenCalled();
        });

        it('should remove member', async () => {
            const deletedMember = {
                id: 'member-2',
            };

            const tx = {
                projectMember: {
                    findUnique: jest
                        .fn()
                        .mockResolvedValueOnce({
                            role: 'OWNER',
                        })
                        .mockResolvedValueOnce({
                            id: 'member-2',
                            role: 'MEMBER',
                        }),

                    delete: jest.fn().mockResolvedValue(deletedMember),
                },

                project: {
                    findFirst: jest.fn().mockResolvedValue({
                        id: 'project-1',
                    }),
                },
            };

            setupTransaction(tx);

            const result = await service.removeMember(
                'workspace-1',
                'project-1',
                'user-1',
                'user-2',
            );

            expect(result).toEqual(deletedMember);

            expect(tx.projectMember.delete).toHaveBeenCalledWith({
                where: {
                    id: 'member-2',
                },
            });
        });
    });

    describe('getById', () => {
        it('should throw when user is not a project member', async () => {
            prisma.projectMember.findUnique.mockResolvedValue(null);

            await expect(
                service.getById('workspace-1', 'project-1', 'user-1'),
            ).rejects.toThrow(new NotFoundException('Project not found'));

            expect(prisma.project.findFirst).not.toHaveBeenCalled();
        });

        it('should throw when project does not exist in workspace', async () => {
            prisma.projectMember.findUnique.mockResolvedValue({
                id: 'member-1',
            });

            prisma.project.findFirst.mockResolvedValue(null);

            await expect(
                service.getById('workspace-1', 'project-1', 'user-1'),
            ).rejects.toThrow(new NotFoundException('Project not found'));
        });

        it('should return project', async () => {
            const project = {
                id: 'project-1',
                name: 'Project',
                workspace: {
                    id: 'workspace-1',
                    name: 'Workspace',
                },
                members: [],
                tasks: [],
            };

            prisma.projectMember.findUnique.mockResolvedValue({
                id: 'member-1',
            });

            prisma.project.findFirst.mockResolvedValue(project);

            const result = await service.getById(
                'workspace-1',
                'project-1',
                'user-1',
            );

            expect(result).toEqual(project);
        });
    });

    describe('update', () => {
        it('should reject non-owner', async () => {
            prisma.projectMember.findUnique.mockResolvedValue({
                role: 'MEMBER',
            });

            await expect(
                service.update(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    'New name',
                ),
            ).rejects.toThrow(
                new ForbiddenException('Only project owner can manage project'),
            );

            expect(prisma.project.update).not.toHaveBeenCalled();
        });

        it('should throw when project does not exist', async () => {
            prisma.projectMember.findUnique.mockResolvedValue({
                role: 'OWNER',
            });

            prisma.project.findFirst.mockResolvedValue(null);

            await expect(
                service.update(
                    'workspace-1',
                    'project-1',
                    'user-1',
                    'New name',
                ),
            ).rejects.toThrow(new NotFoundException('Project not found'));
        });

        it('should update project', async () => {
            prisma.projectMember.findUnique.mockResolvedValue({
                role: 'OWNER',
            });

            prisma.project.findFirst.mockResolvedValue({
                id: 'project-1',
            });

            const updatedProject = {
                id: 'project-1',
                name: 'New name',
            };

            prisma.project.update.mockResolvedValue(updatedProject);

            const result = await service.update(
                'workspace-1',
                'project-1',
                'user-1',
                'New name',
            );

            expect(result).toEqual(updatedProject);

            expect(prisma.project.update).toHaveBeenCalledWith({
                where: {
                    id: 'project-1',
                },
                data: {
                    name: 'New name',
                },
            });
        });
    });

    describe('delete', () => {
        it('should reject non-owner', async () => {
            prisma.projectMember.findUnique.mockResolvedValue({
                role: 'MEMBER',
            });

            await expect(
                service.delete('workspace-1', 'project-1', 'user-1'),
            ).rejects.toThrow(
                new ForbiddenException('Only project owner can manage project'),
            );

            expect(prisma.project.delete).not.toHaveBeenCalled();
        });

        it('should throw when project does not exist', async () => {
            prisma.projectMember.findUnique.mockResolvedValue({
                role: 'OWNER',
            });

            prisma.project.findFirst.mockResolvedValue(null);

            await expect(
                service.delete('workspace-1', 'project-1', 'user-1'),
            ).rejects.toThrow(new NotFoundException('Project not found'));
        });

        it('should delete project', async () => {
            prisma.projectMember.findUnique.mockResolvedValue({
                role: 'OWNER',
            });

            prisma.project.findFirst.mockResolvedValue({
                id: 'project-1',
            });

            const deletedProject = {
                id: 'project-1',
                name: 'Project',
            };

            prisma.project.delete.mockResolvedValue(deletedProject);

            const result = await service.delete(
                'workspace-1',
                'project-1',
                'user-1',
            );

            expect(result).toEqual(deletedProject);

            expect(prisma.project.delete).toHaveBeenCalledWith({
                where: {
                    id: 'project-1',
                },
            });
        });
    });
});
