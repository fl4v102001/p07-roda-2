import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';

const app = express();
app.use(cors({ origin: "http://127.0.0.1:5173" })); // Use o IP explícito

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true }); // Não anexe ao servidor ainda

const PORT = process.env.PORT || 8080;

// ... (todo o seu código de lógica de salas: Room, rooms, getRoom, createRoom, etc. permanece aqui)
interface Room {
  id: string
  configurator: WebSocket | null
  spectators: WebSocket[]
  lastConfig: any
}
const rooms: { [key: string]: Room } = {}
function getRoom(id: string): Room | undefined { return rooms[id] }
function createRoom(id: string): Room {
  if (rooms[id]) { return rooms[id] }
  rooms[id] = { id, configurator: null, spectators: [], lastConfig: null, };
  console.log(`Room ${id} created.`);
  return rooms[id];
}
function removeRoom(id: string) { delete rooms[id]; console.log(`Room ${id} closed and removed.`); }
function roomExists(id: string): boolean { return rooms[id] && rooms[id].configurator !== null; }
function broadcastToSpectators(room: Room, message: any) {
  room.spectators.forEach((ws) => {
    try { ws.send(JSON.stringify(message)) } catch (error) { console.error("Failed to send message to spectator:", error) }
  });
}
// ... (fim da lógica de salas)


app.get("/api/raffle/exists/:id", (req, res) => {
    const { id } = req.params;
    res.json({ exists: roomExists(id) });
});

wss.on('connection', (ws, req) => {
    const parameters = new URLSearchParams(req.url?.split('?')[1] || '');
    const raffleId = parameters.get('id');
    const role = parameters.get('role');

    if (!raffleId || !role) {
        ws.close(); return;
    }
    // ... (toda a sua lógica de wss.on('connection') permanece aqui)
    console.log(`New connection for raffle ID: ${raffleId} with role: ${role}`)
    if (role === "configurator") {
        const existingRoom = getRoom(raffleId);
        if (existingRoom && existingRoom.configurator && existingRoom.configurator.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Sala já existente' } }));
            ws.close(); return;
        }
        let room: Room = existingRoom || createRoom(raffleId);
        room.configurator = ws;
        console.log(`Client is CONFIGURATOR for room ${raffleId}`);
        ws.send(JSON.stringify({ type: 'SET_ROLE', payload: { role: 'configurator' } }));
        ws.on("message", (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (message.type === "SYNC_CONFIG" || message.type === "SPIN_WHEEL") {
                    if (message.type === "SYNC_CONFIG") { room.lastConfig = message.payload; }
                    broadcastToSpectators(room, message);
                }
            } catch (error) { console.error("Failed to process message from configurator:", error); }
        });
        ws.on("close", () => {
            broadcastToSpectators(room, { type: "SYNC_CONFIG", payload: { items: [] } });
            room.spectators.forEach((spectator) => spectator.close());
            removeRoom(raffleId);
        });
    } else if (role === "spectator") {
        const room = getRoom(raffleId);
        if (!room || !room.configurator || room.configurator.readyState !== WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'No active configurator for this room.' } }));
            ws.close(); return;
        }
        room.spectators.push(ws);
        console.log(`Client is SPECTATOR for room ${raffleId}`);
        ws.send(JSON.stringify({ type: 'SET_ROLE', payload: { role: 'spectator' } }));
        if (room.lastConfig) {
            ws.send(JSON.stringify({ type: "SYNC_CONFIG", payload: room.lastConfig }));
        }
        ws.on("close", () => {
            room.spectators = room.spectators.filter((s) => s !== ws);
        });
    } else {
        ws.close();
    }
    // ... (fim da lógica de wss.on('connection'))
});

// **CORREÇÃO PRINCIPAL DO BACKEND**
server.on('upgrade', (request, socket, head) => {
    // Usa a API de URL moderna e segura (WHATWG)
    const { pathname } = new URL(request.url || '/', `http://${request.headers.host}`);

    if (pathname === '/ws') { // Apenas aceite upgrades no caminho /ws
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

server.listen(PORT as number, '127.0.0.1', () => { // Escute no IP explícito
    console.log(`Server is listening on http://127.0.0.1:${PORT}`);
});
