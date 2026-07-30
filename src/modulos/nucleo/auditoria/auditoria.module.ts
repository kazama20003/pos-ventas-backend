import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditoriaService } from './auditoria.service';
import { InterceptorAuditoria } from './interceptor-auditoria';
import { PurgaAuditoria } from './worker/purga-auditoria';

/**
 * Auditoría: registra cada mutación autenticada en AuditLog (vía interceptor
 * global) y purga automáticamente el historial vencido (worker de retención).
 */
@Module({
  providers: [
    AuditoriaService,
    PurgaAuditoria,
    { provide: APP_INTERCEPTOR, useClass: InterceptorAuditoria },
  ],
})
export class AuditModule {}
