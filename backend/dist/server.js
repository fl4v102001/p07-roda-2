"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ noServer: true });
const PORT = process.env.PORT || 8080;
const staticFilesPath = path_1.default.join(__dirname, '../../frontend/dist');
app.use(express_1.default.static(staticFilesPath));
const rooms = {};
function getRoom(id) { return rooms[id]; }
function createRoom(id) {
    if (rooms[id]) {
        return rooms[id];
    }
    rooms[id] = { id, configurator: null, spectators: [], lastConfig: null, };
    console.log(`Room ${id} created.`);
    return rooms[id];
}
function removeRoom(id) { delete rooms[id]; console.log(`Room ${id} closed and removed.`); }
function roomExists(id) { return rooms[id] && rooms[id].configurator !== null; }
function broadcastToSpectators(room, message) {
    room.spectators.forEach((ws) => {
        try {
            ws.send(JSON.stringify(message));
        }
        catch (error) {
            console.error("Failed to send message to spectator:", error);
        }
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
        ws.close();
        return;
    }
    // ... (toda a sua lógica de wss.on('connection') permanece aqui)
    console.log(`New connection for raffle ID: ${raffleId} with role: ${role}`);
    if (role === "configurator") {
        const existingRoom = getRoom(raffleId);
        if (existingRoom && existingRoom.configurator && existingRoom.configurator.readyState === ws_1.WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Sala já existente' } }));
            ws.close();
            return;
        }
        let room = existingRoom || createRoom(raffleId);
        room.configurator = ws;
        console.log(`Client is CONFIGURATOR for room ${raffleId}`);
        ws.send(JSON.stringify({ type: 'SET_ROLE', payload: { role: 'configurator' } }));
        ws.on("message", (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (message.type === "SYNC_CONFIG" || message.type === "SPIN_WHEEL") {
                    if (message.type === "SYNC_CONFIG") {
                        room.lastConfig = message.payload;
                    }
                    broadcastToSpectators(room, message);
                }
            }
            catch (error) {
                console.error("Failed to process message from configurator:", error);
            }
        });
        ws.on("close", () => {
            broadcastToSpectators(room, { type: "SYNC_CONFIG", payload: { items: [] } });
            room.spectators.forEach((spectator) => spectator.close());
            removeRoom(raffleId);
        });
    }
    else if (role === "spectator") {
        const room = getRoom(raffleId);
        if (!room || !room.configurator || room.configurator.readyState !== ws_1.WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'No active configurator for this room.' } }));
            ws.close();
            return;
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
    }
    else {
        ws.close();
    }
});
server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '/', `http://${request.headers.host}`);
    if (pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    }
    else {
        socket.destroy();
    }
});
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(staticFilesPath, 'index.html'));
});
server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server is listening on http://127.0.0.1:${PORT}`);
});
