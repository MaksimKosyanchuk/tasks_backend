import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';

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
        const moduleFixture: TestingModule =
            await Test.createTestingModule({
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

        expect(registerResponse.body).toBeDefined();

        userId = registerResponse.body.id;

        // 2. LOGIN

        const loginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email,
                password,
            })
            .expect(201);

        expect(loginResponse.body.accessToken).toBeDefined();

        accessToken = loginResponse.body.accessToken;

        // 3. CREATE WORKSPACE

        const workspaceResponse = await request(app.getHttpServer())
            .post('/workspaces')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'E2E Workspace',
            })
            .expect(201);

        expect(workspaceResponse.body.id).toBeDefined();

        workspaceId = workspaceResponse.body.id;

        // 4. CREATE PROJECT

        const projectResponse = await request(app.getHttpServer())
            .post(`/workspaces/${workspaceId}/projects`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'E2E Project',
                description: 'Project created by e2e test',
            })
            .expect(201);

        expect(projectResponse.body.id).toBeDefined();

        projectId = projectResponse.body.id;

        // 5. CREATE TASK

        const taskResponse = await request(app.getHttpServer())
            .post(
                `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                title: 'E2E Task',
                description: 'Task created by e2e test',
                priority: 'HIGH',
                dueDate: '2026-09-01',
                assigneeId: userId,
            })
            .expect(201);

        expect(taskResponse.body.id).toBeDefined();
        expect(taskResponse.body.title).toBe('E2E Task');
        expect(taskResponse.body.projectId).toBe(projectId);
        expect(taskResponse.body.assigneeId).toBe(userId);
    });
});
