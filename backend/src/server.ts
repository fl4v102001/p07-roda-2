import express from "express"
import http from "http"
import WebSocket from "ws"
import cors from "cors"

const app = express()

// Setup CORS middleware to allow requests from the frontend origin
app.use(cors({ origin: "http://localhost:5173" }))

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

const PORT = process.env.PORT || 8080

interface Room {
  id: string
  configurator: WebSocket | null
  spectators: WebSocket[]
  lastConfig: any
}

const rooms: { [key: string]: Room } = {}

// Modified getRoom: now returns Room | undefined
function getRoom(id: string): Room | undefined {
  return rooms[id]
}

// New function to explicitly create a room
function createRoom(id: string): Room {
  if (rooms[id]) {
    // This should ideally not happen if called correctly
    console.warn(`Attempted to create room ${id} which already exists.`)
    return rooms[id]
  }
  rooms[id] = {
    id,
    configurator: null,
    spectators: [],
    lastConfig: null,
  }
  console.log(`Room ${id} created.`)
  return rooms[id]
}

function removeRoom(id: string) {
  delete rooms[id]
  console.log(`Room ${id} closed and removed.`)
}

function roomExists(id: string): boolean {
  return rooms[id] && rooms[id].configurator !== null
}

function broadcastToSpectators(room: Room, message: any) {
  room.spectators.forEach((ws) => {
    try {
      ws.send(JSON.stringify(message))
    } catch (error) {
      console.error("Failed to send message to spectator:", error)
    }
  })
}

app.get("/api/raffle/exists/:id", (req, res) => {
  const { id } = req.params
  res.json({ exists: roomExists(id) })
})

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`)
  const raffleId = url.searchParams.get("id")
  const role = url.searchParams.get("role") // Extract role from URL

  if (!raffleId || !role) {
    console.log("Connection rejected: No raffle ID or role provided.")
    ws.close()
    return
  }

  console.log(`New connection for raffle ID: ${raffleId} with role: ${role}`)

  if (role === "configurator") {
    const existingRoom = getRoom(raffleId);

    if (existingRoom && existingRoom.configurator && existingRoom.configurator.readyState === WebSocket.OPEN) {
      // A configurator already exists for this room and is active
      console.log(`Connection rejected: Configurator already exists for room ${raffleId}.`)
      ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Sala já existente' } }));
      ws.close()
      return
    }

    let room: Room;
    if (!existingRoom) {
      // Room does not exist, create it
      room = createRoom(raffleId);
    } else {
      // Room exists but no active configurator (stale room), use it
      room = existingRoom;
    }

    room.configurator = ws;
    console.log(`Client is CONFIGURATOR for room ${raffleId}`)

    ws.send(JSON.stringify({ type: 'SET_ROLE', payload: { role: 'configurator' } }));

    // Handle configurator messages
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString())
        if (message.type === "SYNC_CONFIG" || message.type === "SPIN_WHEEL") {
          if (message.type === "SYNC_CONFIG") {
            room.lastConfig = message.payload
          }
          broadcastToSpectators(room, message)
        }
      } catch (error) {
        console.error("Failed to process message from configurator:", error)
      }
    })

    ws.on("close", () => {
      // Clear spectators' wheels and close room
      broadcastToSpectators(room, { type: "SYNC_CONFIG", payload: { items: [] } })
      room.spectators.forEach((spectator) => spectator.close())
      removeRoom(raffleId)
    })
  } else if (role === "spectator") {
    const room = getRoom(raffleId); // Get room, but don't create

    if (!room || !room.configurator || room.configurator.readyState !== WebSocket.OPEN) {
      // No active configurator for this room, cannot join as spectator
      console.log(`Connection rejected: No active configurator for room ${raffleId}.`)
      ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'No active configurator for this room.' } }));
      ws.close()
      return
    }
    // Add as spectator
    room.spectators.push(ws)
    console.log(`Client is SPECTATOR for room ${raffleId}`)

    ws.send(JSON.stringify({ type: 'SET_ROLE', payload: { role: 'spectator' } }));

    // Send current config to new spectator
    if (room.lastConfig) {
      ws.send(JSON.stringify({ type: "SYNC_CONFIG", payload: room.lastConfig }))
    }

    ws.on("close", () => {
      // Remove spectator from list
      room.spectators = room.spectators.filter((s) => s !== ws)
    })
  } else {
    console.log(`Connection rejected: Invalid role provided: ${role}`)
    ws.close()
  }
})

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`)
})