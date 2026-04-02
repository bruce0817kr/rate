import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegulationDocument } from './regulation-document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RegulationDocument])],
  controllers: [],
  providers: [],
  exports: [],
})
export class DocumentsModule {}
