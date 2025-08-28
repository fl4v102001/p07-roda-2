document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const raffleIdInput = document.getElementById('raffleIdInput') as HTMLInputElement | null;
    const keyIdInput = document.getElementById('keyId') as HTMLInputElement | null;
    const loginButton = document.getElementById('loginButton') as HTMLButtonElement | null;
    const createButton = document.getElementById('createButton') as HTMLButtonElement | null;
    const errorMessage = document.getElementById('errorMessage');

    if (!loginForm || !raffleIdInput || !keyIdInput || !loginButton || !createButton || !errorMessage) {
        console.error('Login form elements not found!');
        return;
    }

    const updateButtonStates = () => {
        const keyIdValue = keyIdInput.value.trim();
        if (keyIdValue) {
            loginButton.disabled = true;
            createButton.disabled = false;
        } else {
            loginButton.disabled = false;
            createButton.disabled = true;
        }
    };

    keyIdInput.addEventListener('input', updateButtonStates);

    // Set initial state
    updateButtonStates();

    // Function to establish WebSocket connection
    const connectWebSocket = (raffleId: string, role: 'spectator' | 'configurator') => {
        errorMessage.textContent = ''; // Clear previous errors
        errorMessage.style.display = 'none';

        // ANTES:
        // const ws = new WebSocket(`ws://localhost:8080?id=${raffleId}&role=${role}`);

        // DEPOIS:
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host; // ex: 127.0.0.1:5173
        const wsUrl = `${protocol}//${host}/ws?id=${raffleId}&role=${role}`;
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
            console.log(`WebSocket connected for raffle ID: ${raffleId}. Waiting for role assignment...`);
            // DO NOT REDIRECT HERE. Wait for SET_ROLE message from backend.
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'ERROR') {
                errorMessage.textContent = message.payload.message;
                errorMessage.style.display = 'block';
                ws.close(); // Close the connection on error
            } else if (message.type === 'SET_ROLE') {
                // Backend confirmed role assignment, now redirect
                sessionStorage.setItem('currentRaffleId', raffleId);
                sessionStorage.setItem('currentRaffleRole', message.payload.role); // Use role from backend
                window.location.href = '/raffle.html';
            }
            // Other messages will be handled by raffle.html
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed.');
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            errorMessage.textContent = 'Erro de conexão WebSocket. Verifique o servidor.';
            errorMessage.style.display = 'block';
        };
    };

    // Event listener for "Entrar" button (form submission)
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const raffleId = raffleIdInput.value.trim();

        if (!raffleId) {
            errorMessage.textContent = 'Por favor, insira um ID para o sorteio.';
            errorMessage.style.display = 'block';
            return;
        }

        // Attempt to join as spectator
        connectWebSocket(raffleId, 'spectator');
    });

    // Event listener for "Criar" button
    createButton.addEventListener('click', (event) => {
        event.preventDefault();
        const raffleId = raffleIdInput.value.trim();

        if (!raffleId) {
            errorMessage.textContent = 'Por favor, insira um ID para o sorteio.';
            errorMessage.style.display = 'block';
            return;
        }

        // Attempt to create as configurator
        connectWebSocket(raffleId, 'configurator');
    });
});
