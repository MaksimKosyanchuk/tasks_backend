import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';

type RegisterResponse = {
    id: string;
};

type LoginResponse = {
    accessToken: string;
};

type WorkspaceResponse = {
    id: string;
};

type ProjectResponse = {
    id: string;
};

type TaskResponse = {
    id: string;
    title: string;
    projectId: string;
    assigneeId: string;
};

describe('Critical flow (e2e)', () => {
    let app: INestApplication;

    let accessToken: string;
    let userId: string;
    let workspaceId: string;
    let projectId: string;

    const email = `e2e-${Date.now()}@test.com`;
    const nickName = `e2e-${Date.now()}`;
    const password = 'Password123';

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                transform: true,
            }),
        );

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should complete registration → login → workspace → project → task', async () => {
        // 1. REGISTER

        const registerResponse = await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                email,
                nickName,
                password,
            })
            .expect(201);

        const registerBody = registerResponse.body as RegisterResponse;

        expect(registerBody).toBeDefined();
        expect(registerBody.id).toBeDefined();

        userId = registerBody.id;

        // 2. LOGIN

        const loginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email,
                password,
            })
            .expect(201);

        const loginBody = loginResponse.body as LoginResponse;

        expect(loginBody.accessToken).toBeDefined();

        accessToken = loginBody.accessToken;

        // 3. CREATE WORKSPACE

        const workspaceResponse = await request(app.getHttpServer())
            .post('/workspaces')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'E2E Workspace',
            })
            .expect(201);

        const workspaceBody = workspaceResponse.body as WorkspaceResponse;

        expect(workspaceBody.id).toBeDefined();

        workspaceId = workspaceBody.id;

        // 4. CREATE PROJECT

        const projectResponse = await request(app.getHttpServer())
            .post(`/workspaces/${workspaceId}/projects`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'E2E Project',
                description: 'Project created by e2e test',
            })
            .expect(201);

        const projectBody = projectResponse.body as ProjectResponse;

        expect(projectBody.id).toBeDefined();

        projectId = projectBody.id;

        // 5. CREATE TASK

        const taskResponse = await request(app.getHttpServer())
            .post(`/workspaces/${workspaceId}/projects/${projectId}/tasks`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                title: 'E2E Task',
                description: 'Task created by e2e test',
                priority: 'HIGH',
                dueDate: '2026-09-01',
                assigneeId: userId,
            })
            .expect(201);

        const taskBody = taskResponse.body as TaskResponse;

        expect(taskBody.id).toBeDefined();
        expect(taskBody.title).toBe('E2E Task');
        expect(taskBody.projectId).toBe(projectId);
        expect(taskBody.assigneeId).toBe(userId);
    });
});
