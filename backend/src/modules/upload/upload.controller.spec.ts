import { BadRequestException } from '@nestjs/common';
import { UploadController } from './upload.controller';

describe('UploadController', () => {
  const uploadService = {
    uploadPersonnel: jest.fn(),
    uploadProjects: jest.fn(),
    uploadProjectPersonnel: jest.fn(),
    uploadUsers: jest.fn(),
    uploadTeams: jest.fn(),
  };

  let controller: UploadController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UploadController(uploadService as any);
  });

  it('rejects unsupported upload file extensions before parsing', async () => {
    await expect(
      controller.uploadPersonnel({
        originalname: 'personnel.txt',
        buffer: Buffer.from('not,csv'),
      } as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
    expect(uploadService.uploadPersonnel).not.toHaveBeenCalled();
  });

  it('rejects empty upload files before parsing', async () => {
    await expect(
      controller.uploadPersonnel({
        originalname: 'personnel.csv',
        buffer: Buffer.alloc(0),
        size: 0,
      } as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
    expect(uploadService.uploadPersonnel).not.toHaveBeenCalled();
  });

  it('rejects upload files larger than the import limit before parsing', async () => {
    await expect(
      controller.uploadPersonnel({
        originalname: 'personnel.csv',
        buffer: Buffer.from('name\n홍길동'),
        size: 10 * 1024 * 1024 + 1,
      } as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
    expect(uploadService.uploadPersonnel).not.toHaveBeenCalled();
  });
});
