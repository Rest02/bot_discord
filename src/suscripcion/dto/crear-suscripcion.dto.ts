export class CrearSuscripcionDto {
  nombre: string;
  montoTotal: number;
  diaCobro: number;
  limiteUsuarios: number;
  canalRecordatorio?: string;
}
