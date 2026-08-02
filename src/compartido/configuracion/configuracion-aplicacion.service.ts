import { Injectable } from '@nestjs/common';
import { config } from 'dotenv';

export type Environment = 'local' | 'production' | 'test';

/** Matches the `ms` StringValue accepted by jsonwebtoken (e.g. "15m", "7d"). */
export type DuracionJwt = `${number}${'s' | 'm' | 'h' | 'd' | 'y'}`;

@Injectable()
export class AppConfigService {
  readonly environment: Environment;
  readonly port: number;
  readonly coreDatabaseUrl: string;
  readonly managementDatabaseUrl: string;
  readonly jwtSecret: string;
  readonly jwtExpiresIn: DuracionJwt;
  readonly googleClientId: string;
  readonly corsOrigin: string;
  readonly logLevel: string;
  readonly databasePoolMax: number;
  /** Correo (Resend). Opcionales: si faltan, el envío se omite silenciosamente. */
  readonly resendApiKey: string | null;
  readonly mailFrom: string;
  readonly appUrl: string;

  constructor() {
    const environment = process.env.ENV ?? 'local';

    if (!['local', 'production', 'test'].includes(environment)) {
      throw new Error(`Unsupported ENV: ${environment}`);
    }

    this.environment = environment as Environment;
    config({ path: `.env.${this.environment}`, quiet: true });
    this.port = Number(process.env.PORT ?? 3000);
    this.coreDatabaseUrl = this.required('CORE_DATABASE_URL');
    this.managementDatabaseUrl = this.required('MANAGEMENT_DATABASE_URL');
    this.jwtSecret = this.requireSecret('JWT_SECRET', 32);
    this.jwtExpiresIn = (process.env.JWT_EXPIRES_IN ?? '15m') as DuracionJwt;
    this.googleClientId = this.required('GOOGLE_CLIENT_ID');
    this.corsOrigin = process.env.CORS_ORIGIN ?? '*';
    this.logLevel = process.env.LOG_LEVEL ?? 'log';
    this.databasePoolMax = Number(process.env.DATABASE_POOL_MAX ?? 10);
    this.resendApiKey = process.env.RESEND_API_KEY ?? null;
    this.mailFrom = process.env.MAIL_FROM ?? 'onboarding@resend.dev';
    this.appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(
      /\/+$/,
      '',
    );
  }

  get isProduction(): boolean {
    return this.environment === 'production';
  }

  private required(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`${name} is required`);
    }
    return value;
  }

  private requireSecret(name: string, minLength: number): string {
    const value = this.required(name);
    if (value.length < minLength) {
      throw new Error(`${name} must be at least ${minLength} characters long`);
    }
    return value;
  }
}
