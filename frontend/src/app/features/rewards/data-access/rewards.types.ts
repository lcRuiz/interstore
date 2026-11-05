/** Usuario actual, de `GET /api/me`. */
export interface Me {
  id: number;
  name: string;
  /** Saldo de puntos; lo calcula el servidor. */
  pointsBalance: number;
}
