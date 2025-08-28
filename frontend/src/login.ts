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
    updateButtonStates();

    // Função para guardar os dados e redirecionar
    const setupAndRedirect = (raffleId: string, role: 'spectator' | 'configurator') => {
        if (!raffleId) {
            errorMessage.textContent = 'Por favor, insira um ID para o sorteio.';
            errorMessage.style.display = 'block';
            return;
        }
        // Guarda os dados na sessão do navegador
        sessionStorage.setItem('currentRaffleId', raffleId);
        sessionStorage.setItem('currentRaffleRole', role);
        // Redireciona para a página principal
        window.location.href = '/raffle.html';
    };

    // Event listener para o botão "Entrar"
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const raffleId = raffleIdInput.value.trim();
        setupAndRedirect(raffleId, 'spectator');
    });

    // Event listener para o botão "Criar"
    createButton.addEventListener('click', (event) => {
        event.preventDefault();
        const raffleId = raffleIdInput.value.trim();
        setupAndRedirect(raffleId, 'configurator');
    });
});