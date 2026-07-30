import { CifradoService } from './cifrado.service';

describe('CifradoService', () => {
  const KEY = 'a'.repeat(64); // 32 bytes en hex

  it('cifra y descifra de ida y vuelta con llave configurada', () => {
    process.env.APP_ENCRYPTION_KEY = KEY;
    const svc = new CifradoService();
    const secreto = 'sk_test_culqi_12345';
    const cifrado = svc.cifrar(secreto);
    expect(cifrado.startsWith('enc:v1:')).toBe(true);
    expect(cifrado).not.toContain(secreto);
    expect(svc.descifrar(cifrado)).toBe(secreto);
  });

  it('descifra valores previos en plano sin tocarlos (back-compat)', () => {
    process.env.APP_ENCRYPTION_KEY = KEY;
    const svc = new CifradoService();
    expect(svc.descifrar('secreto-plano-viejo')).toBe('secreto-plano-viejo');
  });

  it('sin llave, guarda en plano (modo dev)', () => {
    delete process.env.APP_ENCRYPTION_KEY;
    const svc = new CifradoService();
    expect(svc.cifrar('x')).toBe('x');
  });

  it('rechaza una llave de tamaño inválido', () => {
    process.env.APP_ENCRYPTION_KEY = 'corta';
    expect(() => new CifradoService()).toThrow();
    delete process.env.APP_ENCRYPTION_KEY;
  });
});
