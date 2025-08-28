import { state } from "./state";
import { renderTable, updateSpeed, handleAddItem, handleTableClick, handleItemUpdate } from "./ui";
import { createWheel, spinWheel } from "./wheel";
import { WebSocketClient } from "./WebSocketClient";
 
// --- DOM Elements ---
const configControls = document.getElementById('configControls');
const configManager = document.getElementById('configManager');
const raffleIdDisplay = document.getElementById('raffleIdDisplay');
const roleDisplay = document.getElementById('roleDisplay');
const exitButton = document.getElementById('exitButton');
const syncButton = document.getElementById('syncButton');
const spinButton = document.getElementById('spinButton');
const addItemForm = document.getElementById('addItemForm');
const itemsTableBody = document.getElementById('itemsTableBody');
const showLinesCheckbox = document.getElementById('showLinesCheckbox') as HTMLInputElement | null;
const showTextCheckbox = document.getElementById('showTextCheckbox') as HTMLInputElement | null;
const speedSlider = document.getElementById('speedSlider') as HTMLInputElement | null;
const raffleTitleInput = document.getElementById('raffleTitleInput') as HTMLInputElement | null;
const managerTitle = document.getElementById('.manager-title');

// --- Variável do Cliente no Escopo do Módulo ---
// A CORREÇÃO CRÍTICA ESTÁ AQUI:
// Ao declarar o 'client' aqui, fora de qualquer função, garantimos que ele
// não seja "perdido" após o carregamento da página.
let client: WebSocketClient | null = null;

// --- Main App Logic ---
function renderApp(isSpectator = false) {
    createWheel();
    renderTable(isSpectator);
    if (raffleTitleInput) raffleTitleInput.value = state.raffleTitle;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: DOM content loaded. Starting main script.");

    const raffleId = sessionStorage.getItem('currentRaffleId');
    const role = sessionStorage.getItem('currentRaffleRole');
    console.log("DEBUG: Retrieved from sessionStorage:", { raffleId, role });

    if (!raffleId || !role) {
        console.log("DEBUG: Validation FAILED. Redirecting to index.html");
        window.location.href = '/index.html';
        return;
    }

    console.log("DEBUG: Validation PASSED.");
    history.replaceState(null, '', '/raffle.html');

    if (raffleIdDisplay) raffleIdDisplay.textContent = `ID do Sorteio: ${raffleId}`;
    if (roleDisplay) {
        roleDisplay.textContent = `Papel: ${role === 'configurator' ? 'Configurador' : 'Espectador'}`;
    }
    if (exitButton) exitButton.style.display = 'block';

    console.log("DEBUG: Creating WebSocket client...");
    client = new WebSocketClient(raffleId, role as string);
    
    console.log("DEBUG: Attempting to connect WebSocket...");
    client.connect();

    exitButton?.addEventListener('click', () => {
        client?.close(); // Agora usa o 'client' que persiste
        window.location.href = '/index.html';
    });

    if (role === 'configurator') {
        setupConfiguratorView(client);
    } else {
        setupSpectatorView(client);
    }

    if (role === 'configurator') {
        renderApp(false);
    }
});

// --- Role-based Setup Functions ---
function setupConfiguratorView(client: WebSocketClient) {
    if (configControls) configControls.style.display = 'flex';
    if (configManager) configManager.style.display = 'block';
    if (managerTitle) managerTitle.style.display = 'block';

    const savedItems = sessionStorage.getItem('rouletteItems');
    if (savedItems) {
        try {
            state.items = JSON.parse(savedItems);
        } catch (e) { console.error("Failed to load items from session:", e); }
    }

    syncButton?.addEventListener('click', () => {
        client.send({
            type: 'SYNC_CONFIG', payload:
            {
                items: state.items,
                spinDuration: state.spinDuration,
                showSubdivisionLines: state.showSubdivisionLines,
                showTextOnWheel: state.showTextOnWheel,
                raffleTitle: state.raffleTitle
            }
        });
    });

    spinButton?.addEventListener('click', () => {
        if (state.items.length === 0) return;
        const spinParams = spinWheel(true);
        client.send({ type: 'SPIN_WHEEL', payload: spinParams });
        spinWheel(false, spinParams);
    });

    addItemForm?.addEventListener('submit', (event) => {
        handleAddItem(event);
        renderApp();
    });

    if (itemsTableBody) {
        itemsTableBody.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains('remove-btn')) {
                handleTableClick(event as MouseEvent);
                renderApp();
            }
        });
        itemsTableBody.addEventListener('input', (event) => {
            handleItemUpdate(event);
            createWheel();
        });
    }

    showLinesCheckbox?.addEventListener('change', () => {
        state.showSubdivisionLines = showLinesCheckbox.checked;
        createWheel();
    });

    showTextCheckbox?.addEventListener('change', () => {
        state.showTextOnWheel = showTextCheckbox.checked;
        createWheel();
    });

    speedSlider?.addEventListener('input', () => {
        if (speedSlider) updateSpeed(speedSlider.value);
    });
    if (speedSlider) updateSpeed(speedSlider.value);

    raffleTitleInput?.addEventListener('input', () => {
        if (raffleTitleInput) {
            state.raffleTitle = raffleTitleInput.value;
        }
    });
}

function setupSpectatorView(client: WebSocketClient) {
    if (spinButton) spinButton.style.display = 'none';
    if (configControls) configControls.style.display = 'none';
    if (configManager) configManager.style.display = 'none';
    if (managerTitle) managerTitle.style.display = 'none';
    if (raffleTitleInput) raffleTitleInput.disabled = true;

    const resultDiv = document.getElementById('result');
    let hasReceivedError = false; // Flag para controlar o estado de erro

    client.on('ERROR', (payload) => {
        hasReceivedError = true; // Marca que um erro foi recebido
        if (resultDiv) {
            resultDiv.innerHTML = `<strong>Erro: ${payload.message}. Redirecionando...</strong>`;
        }
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 3000);
    });

    client.on('SYNC_CONFIG', (payload) => {
        console.log('Syncing config:', payload);
        state.items = payload.items || [];
        state.spinDuration = payload.spinDuration || 20;
        state.showSubdivisionLines = payload.showSubdivisionLines;
        state.showTextOnWheel = payload.showTextOnWheel;
        state.raffleTitle = payload.raffleTitle || '🎯 Roda de Sorteio';
        renderApp(true);
    });

    client.on('SPIN_WHEEL', (payload) => {
        console.log('Received spin command:', payload);
        spinWheel(false, payload);
    });

    client.onClose(() => {
        // Apenas executa a lógica de fechamento padrão se nenhum erro foi tratado
        if (!hasReceivedError) {
            if (resultDiv) {
                resultDiv.innerHTML = '<strong>A sessão foi encerrada pelo configurador. Redirecionando...</strong>';
            }
            if (exitButton) exitButton.setAttribute('disabled', 'true');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 3000);
        }
    });
}
