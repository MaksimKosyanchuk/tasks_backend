import { Test, TestingModule } from '@nestjs/testing';

import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';

describe('WorkspacesController', () => {
    let controller: WorkspacesController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [WorkspacesController],
            providers: [
                {
                    provide: WorkspacesService,
                    useValue: {},
                },
            ],
        })
            .overrideGuard(AccessTokenGuard)
            .useValue({
                canActivate: jest.fn().mockReturnValue(true),
            })
            .compile();

        controller = module.get<WorkspacesController>(WorkspacesController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
