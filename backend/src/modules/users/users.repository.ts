import { Injectable } from '@nestjs/common';
import type { UserRole } from '../../common/types/auth.type';
import { UserRole as PrismaUserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  googleId: string | null;
};

export type CreateUserFromGoogleInput = {
  id: string;
  email: string;
  name: string;
  googleId: string;
};

type PrismaUserRow = {
  id: string;
  email: string;
  name: string;
  role: PrismaUserRole;
  googleId: string | null;
};

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  googleId: true,
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    return row ? this.toUserRecord(row) : null;
  }

  async findByGoogleId(googleId: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({
      where: { googleId },
      select: USER_SELECT,
    });

    return row ? this.toUserRecord(row) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({
      where: { email },
      select: USER_SELECT,
    });

    return row ? this.toUserRecord(row) : null;
  }

  async linkGoogleId(id: string, googleId: string): Promise<UserRecord> {
    const row = await this.prisma.user.update({
      where: { id },
      data: { googleId },
      select: USER_SELECT,
    });

    return this.toUserRecord(row);
  }

  async createFromGoogleProfile(input: CreateUserFromGoogleInput): Promise<UserRecord> {
    const row = await this.prisma.user.create({
      data: {
        id: input.id,
        email: input.email,
        name: input.name,
        googleId: input.googleId,
        role: PrismaUserRole.USER,
      },
      select: USER_SELECT,
    });

    return this.toUserRecord(row);
  }

  private toUserRecord(row: PrismaUserRow): UserRecord {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      googleId: row.googleId,
      role: row.role === PrismaUserRole.ADMIN ? 'ADMIN' : 'USER',
    };
  }
}
