import { Module } from '@nestjs/common';
import { EmpresasController } from './empresas.controller';
import { EmpresasService } from './empresas.service';

/** CRUD de empresas del tenant. */
@Module({
  controllers: [EmpresasController],
  providers: [EmpresasService],
})
export class CompaniesModule {}
