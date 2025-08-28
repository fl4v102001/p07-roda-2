export interface WebSocketMessage {
    type: 'SYNC_CONFIG' | 'SPIN_WHEEL' | 'IDENTIFY' | 'ERROR' | 'SET_ROLE';
    payload?: any;
}

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private messageHandlers: Map<string, (payload: any) => void> = new Map();
    private closeHandler: (() => void) | null = null;

    constructor(private raffleId: string, private role: string) {}

    public connect() {
        // ANTES:
        // const url = `ws://localhost:8080?id=${this.raffleId}&role=${this.role}`;

        // DEPOIS:
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const url = `${protocol}//${host}/ws?id=${this.raffleId}&role=${this.role}`;        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('WebSocket connection established.');
        };

        this.ws.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);
                if (this.messageHandlers.has(message.type)) {
                    this.messageHandlers.get(message.type)!(message.payload);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed.');
            if (this.closeHandler) {
                this.closeHandler();
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    public on(messageType: string, handler: (payload: any) => void) {
        this.messageHandlers.set(messageType, handler);
    }

    public onClose(handler: () => void) {
        this.closeHandler = handler;
    }

    public send(message: WebSocketMessage) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected.');
        }
    }

    public close() {
        this.ws?.close();
    }
}
