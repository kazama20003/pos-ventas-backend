/**
 * Converts a monetary amount to the Spanish words legend SUNAT requires
 * (Catálogo 52, código 1000). Example: 1234.50 → "SON MIL DOSCIENTOS TREINTA
 * Y CUATRO CON 50/100 SOLES". Kept deliberately small and dependency-free.
 */

const UNIDADES = [
  '',
  'UNO',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
];
const ESPECIALES: Record<number, string> = {
  10: 'DIEZ',
  11: 'ONCE',
  12: 'DOCE',
  13: 'TRECE',
  14: 'CATORCE',
  15: 'QUINCE',
  16: 'DIECISEIS',
  17: 'DIECISIETE',
  18: 'DIECIOCHO',
  19: 'DIECINUEVE',
  20: 'VEINTE',
  21: 'VEINTIUNO',
  22: 'VEINTIDOS',
  23: 'VEINTITRES',
  24: 'VEINTICUATRO',
  25: 'VEINTICINCO',
  26: 'VEINTISEIS',
  27: 'VEINTISIETE',
  28: 'VEINTIOCHO',
  29: 'VEINTINUEVE',
};
const DECENAS = [
  '',
  '',
  'VEINTE',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
];
const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
];

function menorAMil(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) partes.push(menorACien(resto));
  return partes.join(' ');
}

function menorACien(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (ESPECIALES[n]) return ESPECIALES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? DECENAS[d] : `${DECENAS[d]} Y ${UNIDADES[u]}`;
}

function enteroALetras(n: number): string {
  if (n === 0) return 'CERO';
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones > 0) {
    partes.push(
      millones === 1 ? 'UN MILLON' : `${menorAMil(millones)} MILLONES`,
    );
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'MIL' : `${menorAMil(miles)} MIL`);
  }
  if (resto > 0) partes.push(menorAMil(resto));
  return partes.join(' ').trim();
}

/** Builds the "SON ... CON XX/100 <moneda>" legend for a Decimal-like string. */
export function montoEnLetras(monto: string, moneda: string): string {
  const [enteroStr, decimalStr = '0'] = monto.split('.');
  const entero = Math.abs(parseInt(enteroStr, 10)) || 0;
  const centavos = decimalStr.padEnd(2, '0').slice(0, 2);
  const nombreMoneda =
    moneda === 'PEN'
      ? 'SOLES'
      : moneda === 'USD'
        ? 'DOLARES AMERICANOS'
        : moneda;
  return `SON ${enteroALetras(entero)} CON ${centavos}/100 ${nombreMoneda}`;
}
