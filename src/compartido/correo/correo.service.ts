import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { AppConfigService } from '../configuracion/configuracion-aplicacion.service';

export interface InvitacionCorreo {
  para: string;
  nombre: string;
  negocio: string;
  /** URL a la que va el botón "Ingresar" (login del front). */
  urlLogin: string;
}

/**
 * Envío de correos vía Resend. Es best-effort: si no hay API key configurada o
 * el proveedor falla, se registra un warning pero NUNCA se lanza el error hacia
 * el flujo de negocio (invitar un usuario no debe fallar porque el correo no
 * salga). El envío por email es un canal accesorio, no la fuente de verdad.
 */
@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);
  private readonly resend: Resend | null;

  constructor(private readonly config: AppConfigService) {
    this.resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;
    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY no configurada: los correos se omitirán (no se enviarán).',
      );
    }
  }

  get habilitado(): boolean {
    return this.resend !== null;
  }

  /**
   * Envía el correo de invitación a un empleado. Nunca lanza: devuelve el
   * resultado con el motivo del fallo (para que la UI pueda mostrarlo).
   */
  async enviarInvitacion(
    datos: InvitacionCorreo,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.resend) {
      const error =
        'Correo deshabilitado: falta RESEND_API_KEY en el servidor.';
      this.logger.warn(`Correo a ${datos.para} omitido: ${error}`);
      return { ok: false, error };
    }
    try {
      const { error } = await this.resend.emails.send({
        from: this.config.mailFrom,
        to: datos.para,
        subject: `Te invitaron a ${datos.negocio}`,
        html: plantillaInvitacion(datos),
      });
      if (error) {
        this.logger.error(
          `Resend rechazó el correo a ${datos.para}: ${error.message}`,
        );
        return { ok: false, error: error.message };
      }
      this.logger.log(`Correo de invitación enviado a ${datos.para}`);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Fallo enviando correo a ${datos.para}: ${msg}`);
      return { ok: false, error: msg };
    }
  }
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plantillaInvitacion(d: InvitacionCorreo): string {
  const nombre = escapar(d.nombre);
  const negocio = escapar(d.negocio);
  const url = escapar(d.urlLogin);
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:32px 32px 8px;">
                <h1 style="margin:0 0 8px;font-size:20px;">Hola ${nombre},</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3f46;">
                  Te invitaron a formar parte de <strong>${negocio}</strong>.
                  Ingresa con tu cuenta de Google de este mismo correo para activar tu acceso.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;">
                <a href="${url}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:10px;">
                  Ingresar
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
                  Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
                  <a href="${url}" style="color:#2563eb;word-break:break-all;">${url}</a>
                </p>
                <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">
                  Si no esperabas esta invitación, puedes ignorar este correo.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
