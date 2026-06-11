import { Injectable } from '@nestjs/common';
import type { UserRole } from '../../common/types/auth.type';
import { UserRole as PrismaUserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

export type User = {
  id: string;
  email: string;
  name: string;
  username: string;
  password: string;
  roles: UserRole[];
};

@Injectable()
export class UsersService {
  private readonly users: User[] = [
    {
      id: '018f2b1c-88f8-7a11-9fd2-111111111111',
      email: 'john@example.com',
      name: 'John',
      username: 'john',
      password: 'changeme',
      roles: ['USER'],
    },
    {
      id: '018f2b1c-88f8-7a11-9fd2-222222222222',
      email: 'maria@example.com',
      name: 'Maria',
      username: 'maria',
      password: 'guess',
      roles: ['ADMIN'],
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  findOne(username: string): User | undefined {
    return this.users.find((user) => user.username === username);
  }

  findById(id: string): User | undefined {
    return this.users.find((user) => user.id === id);
  }

  async ensureDatabaseUser(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: {
        id: user.id,
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: this.toPrismaRole(user.roles),
      },
      update: {
        email: user.email,
        name: user.name,
        role: this.toPrismaRole(user.roles),
      },
    });
  }

  private toPrismaRole(roles: UserRole[]): PrismaUserRole {
    return roles.includes('ADMIN') ? PrismaUserRole.ADMIN : PrismaUserRole.USER;
  }
}
