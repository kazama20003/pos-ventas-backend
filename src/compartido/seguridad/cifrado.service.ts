import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIJO = 'enc:v1:';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Cifra secretos en reposo (llaves de pasarela, secretos de webhook, etc.) con
 * AES-256-GCM. La llave maestra sale de APP_ENCRYPTION_KEY (32 bytes en hex de
 * 64 chars o base64).
 *
 * Compatibilidad: los valores cifrados llevan el prefijo `enc:v1:`. `descifrar`
 * devuelve tal cual cualquier valor sin ese prefijo (secretos previos en plano),
 * de modo que activar el cifrado no rompe datos existentes. Si la llave no está
 * configurada, `cifrar` guarda en plano y advierte (útil solo en dev).
 */
@Injectable()
export class CifradoService {
  private readonly logger = new Logger(CifradoService.name);
  private readonly key: Buffer | null = this.cargarLlave();

  cifrar(texto: string): string {
    if (!this.key) {
      this.logger.warn(
        'APP_ENCRYPTION_KEY no configurada: el secreto se guarda EN PLANO',
      );
      return texto;
    }
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ct = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIJO + Buffer.concat([iv, tag, ct]).toString('base64');
  }

  descifrar(valor: string): string {
    if (!valor.startsWith(PREFIJO)) {
      // Valor previo en plano (o cifrado deshabilitado): se devuelve tal cual.
      return valor;
    }
    if (!this.key) {
      throw new Error(
        'Secreto cifrado pero APP_ENCRYPTION_KEY no está configurada',
      );
    }
    const datos = Buffer.from(valor.slice(PREFIJO.length), 'base64');
    const iv = datos.subarray(0, IV_BYTES);
    const tag = datos.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ct = datos.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
      'utf8',
    );
  }

  private cargarLlave(): Buffer | null {
    const raw = process.env.APP_ENCRYPTION_KEY;
    if (!raw) return null;
    const buf =
      raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)
        ? Buffer.from(raw, 'hex')
        : Buffer.from(raw, 'base64');
    if (buf.length !== 32) {
      throw new Error(
        'APP_ENCRYPTION_KEY debe ser de 32 bytes (64 hex o base64)',
      );
    }
    return buf;
  }
}
