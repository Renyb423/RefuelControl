export interface RefuelRecord {
  id: string;
  fecha: string;          // YYYY-MM-DD
  precioPorLitro: number; // €/L
  litros: number;          // L
  total: number;           // €
  gasolinera?: string;     // e.g., "Costco - Gasolina"
}
