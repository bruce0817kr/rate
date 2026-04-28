import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from './user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.NODE_ENV;
    delete process.env.ALLOW_SELF_REGISTRATION;
  });

  it('blocks self-registration in production by default', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_SELF_REGISTRATION = 'false';

    await expect(
      service.registerWithCompanyEmail({
        username: 'new.user@gtp.or.kr',
        password: 'password123',
      }),
    ).rejects.toThrow('Self-registration is disabled');
    expect(usersRepository.findOne).not.toHaveBeenCalled();
  });

  it('returns canManageActualSalary from list payloads', async () => {
    const createdAt = new Date();
    usersRepository.find.mockResolvedValue([
      {
        id: 'user-1',
        username: 'planner@gtp.or.kr',
        name: 'Planner',
        role: UserRole.STRATEGY_PLANNING,
        isActive: true,
        canManageActualSalary: true,
        createdAt,
      } as User,
    ]);

    const result = await service.findAll();

    expect(result[0]).toMatchObject({
      canManageActualSalary: true,
      role: UserRole.STRATEGY_PLANNING,
    });
  });

  it('updates canManageActualSalary when an admin changes a user', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      username: 'planner@gtp.or.kr',
      name: 'Planner',
      role: UserRole.STRATEGY_PLANNING,
      isActive: true,
      canManageActualSalary: false,
      createdAt: new Date(),
    } as User);
    usersRepository.save.mockImplementation(async (input) => input as User);

    const result = await service.update('user-1', {
      canManageActualSalary: true,
    });

    expect(result.canManageActualSalary).toBe(true);
  });
});
