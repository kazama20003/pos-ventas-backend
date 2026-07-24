import { Injectable } from '@nestjs/common';
import { config } from 'dotenv';

export type Environment = 'local' | 'production' | 'test';

@Injectable()
export class AppConfigService {
  readonly environment: Environment;
  readonly port: number;
  readonly coreDatabaseUrl: string;
  readonly managementDatabaseUrl: string;

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
  }

  private required(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`${name} is required`);
    }
    return value;
  }
}
