import type { AppState, ConnectionState } from "./types"

export const state: AppState = {
  items: [],
  raffleTitle: "🎯 Roda de Sorteio",
  isSpinning: false,
  currentRotation: 0,
  spinDuration: 20, // Duração padrão em segundos
  showSubdivisionLines: true, // Controla a visibilidade das linhas
  showTextOnWheel: true, // Controla a visibilidade do texto nas fatias
  connectionState: "CONNECTED" as ConnectionState,
  reconnectAttempt: 0,
}

// items: [
//   { name: 'Alex', quantity: 10, color: '#ff6b6b' },
//   { name: 'Ariel', quantity: 20, color: '#4ecdc4' },
//   { name: 'Cris', quantity: 5, color: '#45b7d1' },
//   { name: 'Luan', quantity: 15, color: '#feca57' },
//   { name: 'Andrea', quantity: 30, color: '#ff9ff3' },
//   { name: 'Fran', quantity: 10, color: '#54a0ff' },
// ],
