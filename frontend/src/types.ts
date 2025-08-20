export interface RouletteItem {
  name: string
  quantity: number
  color: string
}

export enum ConnectionState {
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  FAILED = "failed",
  OFFLINE = "offline",
}

export interface AppState {
  items: RouletteItem[]
  isSpinning: boolean
  currentRotation: number
  spinDuration: number
  showSubdivisionLines: boolean
  showTextOnWheel: boolean
  raffleTitle: string
  connectionState: ConnectionState
  reconnectAttempt: number
}
