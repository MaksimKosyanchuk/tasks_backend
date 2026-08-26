import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthJwtService } from './jwt/jwt.service';
import { AccessTokenGuard } from './guards/access-token.guard';

@Module({
    imports: [UsersModule, JwtModule.register({}),],
    controllers: [AuthController],
    providers: [
        AuthService,
        AccessTokenGuard,
        AuthJwtService,
    ],
    exports: [
        AuthJwtService,
        AccessTokenGuard,
    ],
})
export class AuthModule {}
