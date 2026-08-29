import { Controller, Get } from '@nestjs/common';
import {
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    @Get()
    @ApiOperation({
        summary: 'Health check',
        description: 'Returns the current health status of the API.',
    })
    @ApiResponse({
        status: 200,
        description: 'API is running.',
        schema: {
            example: {
                status: 'ok',
                timestamp: '2026-08-29T17:30:00.000Z',
            },
        },
    })
    check() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }
}