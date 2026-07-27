import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { CorePrismaService } from '../../../compartido/base-datos/prisma-operaciones.service';
import {
  AppConfigService,
  DuracionJwt,
} from '../../../compartido/configuracion/configuracion-aplicacion.service';
import {
  PayloadJwt,
  TokensEmitidos,
  UsuarioAutenticado,
} from './autenticacion.tipos';
import { LoginDto } from './dto/login.dto';

const REFRESH_EXPIRES_IN: DuracionJwt = '7d';

@Injectable()
export class AutenticacionService {
  constructor(
    private readonly prisma: CorePrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async login(dto: LoginDto): Promise<TokensEmitidos> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { codigo: dto.tenantCodigo },
      select: { id: true, estado: true },
    });
    if (!tenant || tenant.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const identidad = await this.prisma.ejecutarEnTenant(tenant.id, (tx) =>
      tx.userIdentity.findUnique({
        where: {
          inquilinoId_email: { inquilinoId: tenant.id, email: dto.email },
        },
        select: { id: true, email: true, estado: true, passwordHash: true },
      }),
    );

    // Uniform failure to avoid leaking which factor was wrong.
    if (
      !identidad ||
      identidad.estado !== 'ACTIVO' ||
      !identidad.passwordHash
    ) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valido = await bcrypt.compare(dto.password, identidad.passwordHash);
    if (!valido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.prisma.ejecutarEnTenant(tenant.id, (tx) =>
      tx.userIdentity.update({
        where: { id: identidad.id },
        data: { ultimoIngresoEn: new Date() },
      }),
    );

    return this.emitirTokens({
      identidadUsuarioId: identidad.id,
      inquilinoId: tenant.id,
      email: identidad.email,
    });
  }

  async refrescar(refreshToken: string): Promise<TokensEmitidos> {
    let payload: PayloadJwt;
    try {
      payload = await this.jwt.verifyAsync<PayloadJwt>(refreshToken, {
        secret: this.config.jwtSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
    if (payload.tipo !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const identidad = await this.prisma.ejecutarEnTenant(
      payload.inquilinoId,
      (tx) =>
        tx.userIdentity.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, estado: true, inquilinoId: true },
        }),
    );
    if (!identidad || identidad.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Refresh token inválido');
    }

    return this.emitirTokens({
      identidadUsuarioId: identidad.id,
      inquilinoId: identidad.inquilinoId,
      email: identidad.email,
    });
  }

  private async emitirTokens(
    usuario: UsuarioAutenticado,
  ): Promise<TokensEmitidos> {
    const base = {
      sub: usuario.identidadUsuarioId,
      inquilinoId: usuario.inquilinoId,
      email: usuario.email,
    };

    const accessToken = await this.jwt.signAsync(
      { ...base, tipo: 'access' } satisfies PayloadJwt,
      { secret: this.config.jwtSecret, expiresIn: this.config.jwtExpiresIn },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...base, tipo: 'refresh' } satisfies PayloadJwt,
      { secret: this.config.jwtSecret, expiresIn: REFRESH_EXPIRES_IN },
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.config.jwtExpiresIn,
    };
  }
}
