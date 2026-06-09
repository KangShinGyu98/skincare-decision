import { Injectable } from '@nestjs/common';
import type { UserRole } from '../../common/types/auth.type';

export type User = {
  id: string;
  username: string;
  password: string;
  roles: UserRole[];
};

@Injectable()
export class UsersService {
  private readonly users: User[] = [
    {
      id: '018f2b1c-88f8-7a11-9fd2-111111111111',
      username: 'john',
      password: 'changeme',
      roles: ['USER'],
    },
    {
      id: '018f2b1c-88f8-7a11-9fd2-222222222222',
      username: 'maria',
      password: 'guess',
      roles: ['ADMIN'],
    },
  ];

  async findOne(username: string): Promise<User | undefined> {
    return Promise.resolve(this.users.find((user) => user.username === username));
  }

  async findById(id: string): Promise<User | undefined> {
    return Promise.resolve(this.users.find((user) => user.id === id));
  }
}
