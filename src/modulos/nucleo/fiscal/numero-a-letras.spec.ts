import { montoEnLetras } from './numero-a-letras';

describe('montoEnLetras', () => {
  it('convierte enteros y centavos a la leyenda SUNAT en soles', () => {
    expect(montoEnLetras('1234.50', 'PEN')).toBe(
      'SON MIL DOSCIENTOS TREINTA Y CUATRO CON 50/100 SOLES',
    );
  });

  it('maneja el cero', () => {
    expect(montoEnLetras('0.00', 'PEN')).toBe('SON CERO CON 00/100 SOLES');
  });

  it('usa CIEN exacto y dólares', () => {
    expect(montoEnLetras('100.00', 'USD')).toBe(
      'SON CIEN CON 00/100 DOLARES AMERICANOS',
    );
  });

  it('rellena centavos de un dígito', () => {
    expect(montoEnLetras('5.5', 'PEN')).toBe('SON CINCO CON 50/100 SOLES');
  });

  it('convierte millones', () => {
    expect(montoEnLetras('1000000.00', 'PEN')).toBe(
      'SON UN MILLON CON 00/100 SOLES',
    );
  });
});
