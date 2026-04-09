import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserRole } from './user.entity';
import { Personnel } from '../personnel/personnel.entity';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let personnelRepository: jest.Mocked<Repository<Personnel>>;

  const mockPersonnel: Partial<Personnel> = {
    id: 'personnel-1',
    employeeId: 'EMP001',
    name: '홍길동',
    team: '플랫폼팀',
    position: '연구원',
    isActive: true,
  };

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
        {
          provide: getRepositoryToken(Personnel),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
    personnelRepository = module.get(getRepositoryToken(Personnel));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerFromPersonnel', () => {
    it('creates an active GENERAL user when the employee exists in personnel data', async () => {
      usersRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      personnelRepository.findOne.mockResolvedValue(mockPersonnel as Personnel);
      usersRepository.create.mockImplementation((input) => input as User);
      usersRepository.save.mockImplementation(async (input) => ({
        id: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...input,
      }) as User);

      const result = await service.registerFromPersonnel({
        employeeId: 'EMP001',
        name: '홍길동',
        username: 'hong',
        password: 'password123',
      });

      expect(personnelRepository.findOne).toHaveBeenCalledWith({
        where: {
          employeeId: 'EMP001',
          isActive: true,
        },
      });
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'hong',
          name: '홍길동',
          role: UserRole.GENERAL,
          isActive: true,
        }),
      );
      expect(result.role).toBe(UserRole.GENERAL);
      expect(result.isActive).toBe(true);
      expect(await bcrypt.compare('password123', result.passwordHash)).toBe(true);
    });

    it('rejects signup when no active personnel record matches', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      personnelRepository.findOne.mockResolvedValue(null);

      await expect(
        service.registerFromPersonnel({
          employeeId: 'EMP404',
          name: '없는사람',
          username: 'missing',
          password: 'password123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects signup when the username already exists', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 'user-1' } as User);

      await expect(
        service.registerFromPersonnel({
          employeeId: 'EMP001',
          name: '홍길동',
          username: 'hong',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
