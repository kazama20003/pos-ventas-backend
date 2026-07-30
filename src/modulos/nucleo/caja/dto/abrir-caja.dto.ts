import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class AbrirCajaDto {
  @IsUUID()
  sucursalId!: string;

  @IsUUID()
  cajaId!: string;

  @IsOptional()
  @IsUUID()
  terminalId?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoApertura!: number;
}
