import { state } from "./state";
import type { RouletteItem } from "./types";
import { renderTable, updateSpeed, handleAddItem, handleTableClick, handleItemUpdate } from "./ui";
import { createWheel, spinWheel } from "./wheel";
import { WebSocketClient } from "./WebSocketClient";

// --- DOM Elements ---
const configControls = document.getElementById('configControls');
const configManager = document.getElementById('configManager');
const raffleIdDisplay = document.getElementById('raffleIdDisplay');
const roleDisplay = document.getElementById('roleDisplay'); // Added roleDisplay
const exitButton = document.getElementById('exitButton');
const syncButton = document.getElementById('syncButton');
const spinButton = document.getElementById('spinButton');
const addItemForm = document.getElementById('addItemForm');
const itemsTableBody = document.getElementById('itemsTableBody');
const showLinesCheckbox = document.getElementById('showLinesCheckbox') as HTMLInputElement | null;
const showTextCheckbox = document.getElementById('showTextCheckbox') as HTMLInputElement | null;
const speedSlider = document.getElementById('speedSlider') as HTMLInputElement | null;
const raffleTitleInput = document.getElementById('raffleTitleInput') as HTMLInputElement | null;
const managerTitle = document.querySelector('.manager-title'); // Added managerTitle

// --- Main App Logic ---
function renderApp(isSpectator = false) {
    createWheel();
    renderTable(isSpectator);
    if (raffleTitleInput) raffleTitleInput.value = state.raffleTitle;
}

document.addEventListener('DOMContentLoaded', () => {
    // Retrieve raffleId and role from sessionStorage
    const raffleId = sessionStorage.getItem('currentRaffleId');
    const role = sessionStorage.getItem('currentRaffleRole');

    if (!raffleId || !role) {
        window.location.href = '/index.html'; // Redirect to login if no ID/role in session
        return;
    }

    // Clean up the URL (optional, but good for aesthetics)
    history.replaceState(null, '', '/raffle.html');

    if (raffleIdDisplay) raffleIdDisplay.textContent = `ID do Sorteio: ${raffleId}`;
    if (roleDisplay) { // Update role display
        roleDisplay.textContent = `Papel: ${role === 'configurator' ? 'Configurador' : 'Espectador'}`;
    }
    if (exitButton) exitButton.style.display = 'block';

    const client = new WebSocketClient(raffleId, role as string);
    client.connect();

    exitButton?.addEventListener('click', () => {
        client.close();
        window.location.href = '/index.html';
    });

    if (role === 'configurator') {
        setupConfiguratorView(client);
    }
    else {
        setupSpectatorView(client);
    }

    // Initial render for configurator, spectator will render on SYNC_CONFIG
    if (role === 'configurator') {
        renderApp(false);
    }
});

// --- Role-based Setup Functions ---

function setupConfiguratorView(client: WebSocketClient) {
    // Show all admin controls
    if (configControls) configControls.style.display = 'flex';
    if (configManager) configManager.style.display = 'block';
    if (managerTitle) managerTitle.style.display = 'block'; // Ensure managerTitle is visible for configurator

    // Load state from session for persistence
    const savedItems = sessionStorage.getItem('rouletteItems');
    if (savedItems) {
        try {
            state.items = JSON.parse(savedItems);
        } catch (e) { console.error("Failed to load items from session:", e); }
    }

    // --- Event Listeners for Configurator ---
    syncButton?.addEventListener('click', () => {
        client.send({ type: 'SYNC_CONFIG', payload: 
            { items: state.items,
                spinDuration: state.spinDuration,
                showSubdivisionLines: state.showSubdivisionLines,
                showTextOnWheel: state.showTextOnWheel,
                raffleTitle: state.raffleTitle // Add raffleTitle to payload
            } });
    });

    spinButton?.addEventListener('click', () => {
        if (state.items.length === 0) return;
        // 1. Get parameters for a deterministic spin
        const spinParams = spinWheel(true); // Pass true to get params without running animation
        
        // 2. Send the deterministic parameters to the server for broadcasting
        client.send({ type: 'SPIN_WHEEL', payload: spinParams });

        // 3. Run the animation locally with the same parameters
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
        if(speedSlider) updateSpeed(speedSlider.value);
    });
    if(speedSlider) updateSpeed(speedSlider.value);

    // Event listener for raffleTitleInput
    raffleTitleInput?.addEventListener('input', () => {
        if (raffleTitleInput) {
            state.raffleTitle = raffleTitleInput.value;
        }
    });
}

function setupSpectatorView(client: WebSocketClient) {
    // Hide the spin button for spectators
    if (spinButton) spinButton.style.display = 'none';
    
    // Hide all admin controls
    if (configControls) configControls.style.display = 'none';
    if (configManager) configManager.style.display = 'none'; // Hide configManager
    if (managerTitle) managerTitle.style.display = 'none'; // Hide managerTitle

    // Disable raffleTitleInput for spectators
    if (raffleTitleInput) raffleTitleInput.disabled = true;

    client.on('SYNC_CONFIG', (payload) => {
        console.log('Syncing config:', payload);
        state.items = payload.items || [];
        state.spinDuration = payload.spinDuration || 20; // Usa um padrão caso não venha
        state.showSubdivisionLines = payload.showSubdivisionLines;
        state.showTextOnWheel = payload.showTextOnWheel;
        state.raffleTitle = payload.raffleTitle || '🎯 Roda de Sorteio'; // Update raffleTitle
        renderApp(true);
    });

    client.on('SPIN_WHEEL', (payload) => {
        console.log('Received spin command:', payload);
        spinWheel(false, payload); // Pass false to run animation with received params
    });

    client.onClose(() => {
        const resultDiv = document.getElementById('result');
        if (resultDiv) {
            resultDiv.innerHTML = '<strong>A sessão foi encerrada pelo configurador. Redirecionando...</strong>';
        }
        // Disable exit button to prevent closing a closed connection
        if (exitButton) exitButton.setAttribute('disabled', 'true');
        
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 3000); // Redirect after 3 seconds
    });
}