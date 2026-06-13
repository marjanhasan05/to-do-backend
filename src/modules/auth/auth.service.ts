import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RegisterDto } from './dto/register.dto';

const ACCESS_TOKEN_EXPIRES_IN = '7d';
const REFRESH_TOKEN_TTL_DAYS = 30;
const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string) {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const user = await this.prismaService.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name?.trim() || null,
      },
    });

    const session = await this.createSession(user.id, userAgent, ipAddress);

    return {
      user: this.serializeUser(user),
      accessToken: await this.createAccessToken(user.id, user.email),
      refreshToken: session.plainRefreshToken,
      sessionExpiresAt: session.expiresAt,
    };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const session = await this.createSession(user.id, userAgent, ipAddress);

    return {
      user: this.serializeUser(user),
      accessToken: await this.createAccessToken(user.id, user.email),
      refreshToken: session.plainRefreshToken,
      sessionExpiresAt: session.expiresAt,
    };
  }

  async logout(userId: string, dto: LogoutDto) {
    const refreshTokenHash = this.hashRefreshToken(dto.refreshToken);
    const session = await this.prismaService.session.findFirst({
      where: {
        userId,
        refreshTokenHash,
        revokedAt: null,
      },
    });

    if (!session) {
      throw new BadRequestException('Active session not found');
    }

    await this.prismaService.session.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      loggedOut: true,
    };
  }

  private async createAccessToken(userId: string, email: string) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        email,
      },
      {
        secret: process.env.JWT_SECRET ?? 'dev-secret',
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      },
    );
  }

  private async createSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const plainRefreshToken = randomUUID();
    const refreshTokenHash = this.hashRefreshToken(plainRefreshToken);
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    const session = await this.prismaService.session.create({
      data: {
        userId,
        refreshTokenHash,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });

    return {
      ...session,
      plainRefreshToken,
    };
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private serializeUser(user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
