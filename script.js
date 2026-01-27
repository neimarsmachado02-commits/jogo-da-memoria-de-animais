const loginScreen = document.getElementById('login-screen');
const authUsernameInput = document.getElementById('login-username');
const authPasswordInput = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const authMessage = document.getElementById('auth-message');
const userDisplay = document.getElementById('user-display');

const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');
const startGameBtn = document.getElementById('start-game-btn');

const gameBoard = document.getElementById('game-board');
const resetBtn = document.getElementById('reset-btn');
const winModal = document.getElementById('win-modal');
const playAgainBtn = document.getElementById('play-again-btn');
const changePlayerBtn = document.getElementById('change-player-btn');
const diffBtns = document.querySelectorAll('.diff-btn');
const timeDisplay = document.getElementById('time');
const finalTimeDisplay = document.getElementById('final-time');
const saveScoreBtn = document.getElementById('save-score-btn');
const saveMessage = document.getElementById('save-message');
const rankingTableBody = document.querySelector('#ranking-table tbody');
const modalRankingTableBody = document.querySelector('#modal-ranking-table tbody');
const rankFilters = document.querySelectorAll('.rank-filter');
const bgMusic = document.getElementById('bg-music');
const soundToggleBtn = document.getElementById('sound-toggle-btn');

// Global State
let isMuted = false;
let audioStarted = false;
let cards = [];
let flippedCards = [];
let matchedCount = 0;
let isLockBoard = false;
let currentLevel = 'medium';
let timerInterval;
let startTime;
let gameActive = false;
let currentTime = 0;
let currentRankDifficulty = 'medium';

const animalsPool = [
    { name: 'Leão', emoji: '🦁' },
    { name: 'Panda', emoji: '🐼' },
    { name: 'Raposa', emoji: '🦊' },
    { name: 'Coelho', emoji: '🐰' },
    { name: 'Coala', emoji: '🐨' },
    { name: 'Macaco', emoji: '🐵' },
    { name: 'Gato', emoji: '🐱' },
    { name: 'Cachorro', emoji: '🐶' },
    { name: 'Elefante', emoji: '🐘' },
    { name: 'Girafa', emoji: '🦒' },
    { name: 'Coruja', emoji: '🦉' },
    { name: 'Pinguim', emoji: '🐧' },
    { name: 'Tigre', emoji: '🐯' },
    { name: 'Sapo', emoji: '🐸' }
];

const levels = {
    easy: { pairs: 4, cols: 4 },
    medium: { pairs: 6, cols: 4 },
    hard: { pairs: 8, cols: 4 }
};

// Ranking Logic
async function fetchRanking(difficulty) {
    try {
        const response = await fetch(`/api/ranking?difficulty=${difficulty}`);
        const data = await response.json();
        renderRanking(data);
    } catch (error) {
        console.error('Error fetching ranking:', error);
    }
}

function renderRanking(data) {
    console.log('Dados do ranking recebidos:', data);

    // Atualiza tabela da tela inicial
    if (rankingTableBody) {
        rankingTableBody.innerHTML = '';
        if (data.length === 0) {
            rankingTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center">Sem recordes ainda!</td></tr>';
        } else {
            data.forEach((score, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${index + 1}º</td><td>${score.name}</td><td>${score.time_taken}s</td>`;
                rankingTableBody.appendChild(row);
            });
        }
    }

    // Atualiza tabela do modal de vitória
    if (modalRankingTableBody) {
        modalRankingTableBody.innerHTML = '';
        if (data.length === 0) {
            modalRankingTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center">Sem recordes...</td></tr>';
        } else {
            data.forEach((score, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${index + 1}º</td><td>${score.name}</td><td>${score.time_taken}s</td>`;
                modalRankingTableBody.appendChild(row);
            });
        }
    }
}

function updateRankFilter(difficulty) {
    currentRankDifficulty = difficulty;
    rankFilters.forEach(btn => {
        if (btn.dataset.level === difficulty) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    fetchRanking(difficulty);
}

// Auth Logic
async function handleAuth(type) {
    const username = authUsernameInput.value.trim();
    const password = authPasswordInput.value.trim();

    if (!username || !password) {
        authMessage.textContent = 'Preencha todos os campos.';
        return;
    }

    try {
        const route = type === 'login' ? '/api/login' : '/api/register';
        const response = await fetch(`${route}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authMessage.style.color = 'var(--accent-color)';
            if (type === 'login') {
                authMessage.textContent = 'Sucesso!';
                currentPlayer = data.username;
                userDisplay.textContent = currentPlayer;
                console.log('Login bem-sucedido. Usuário atual:', currentPlayer);
                setTimeout(() => {
                    loginScreen.style.display = 'none';
                    startScreen.style.display = 'flex';
                    authMessage.textContent = '';
                }, 500);
            } else {
                authMessage.textContent = 'Registrado! Entrando...';
                setTimeout(() => handleAuth('login'), 1000);
            }
        } else {
            authMessage.style.color = '#ff4757';
            authMessage.textContent = data.error || 'Erro na autenticação.';
        }
    } catch (error) {
        console.error('Erro na requisição handleAuth:', error);
        authMessage.textContent = 'Erro de conexão.';
    }
}

loginBtn.addEventListener('click', () => handleAuth('login'));
registerBtn.addEventListener('click', () => handleAuth('register'));

// Start Screen Logic
startGameBtn.addEventListener('click', () => {
    if (currentPlayer) {
        console.log('Iniciando jogo com o nome:', currentPlayer);
        startScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        initGame();
    } else {
        // Fallback caso algo dê errado no fluxo de login
        location.reload();
    }
});

rankFilters.forEach(btn => {
    btn.addEventListener('click', () => {
        updateRankFilter(btn.dataset.level);
    });
});

function initGame() {
    startAudio();
    stopTimer();
    currentTime = 0;
    timeDisplay.textContent = '0';
    saveMessage.textContent = '';

    saveScoreBtn.disabled = false;
    saveScoreBtn.textContent = 'Salvar Pontuação';

    const config = levels[currentLevel];
    const selectedAnimals = getRandomSubset(animalsPool, config.pairs);

    cards = [...selectedAnimals, ...selectedAnimals];
    shuffle(cards);
    gameBoard.innerHTML = '';
    flippedCards = [];
    matchedCount = 0;
    isLockBoard = false;
    winModal.style.display = 'none';
    gameActive = true;

    gameBoard.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;
    if (window.innerWidth < 600 && config.cols > 3) {
        gameBoard.style.gridTemplateColumns = `repeat(3, 1fr)`;
    }

    cards.forEach((animal, index) => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.name = animal.name;
        card.dataset.id = index;

        card.innerHTML = `
            <div class="card-face card-front">
                <span class="emoji">${animal.emoji}</span>
            </div>
            <div class="card-face card-back"></div>
        `;

        card.addEventListener('click', flipCard);
        gameBoard.appendChild(card);
    });

    startTimer();
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        if (!gameActive) return;
        const now = Date.now();
        currentTime = Math.floor((now - startTime) / 1000);
        timeDisplay.textContent = currentTime;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    gameActive = false;
}

function getRandomSubset(array, size) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function flipCard() {
    if (isLockBoard) return;
    if (this === flippedCards[0]) return;
    if (this.classList.contains('matched')) return;

    this.classList.add('flipped');
    flippedCards.push(this);

    if (flippedCards.length === 2) {
        checkMatch();
    }
}

function checkMatch() {
    isLockBoard = true;
    const [card1, card2] = flippedCards;
    const isMatch = card1.dataset.name === card2.dataset.name;

    if (isMatch) {
        disableCards();
    } else {
        unflipCards();
    }
}

function disableCards() {
    flippedCards[0].classList.add('matched');
    flippedCards[1].classList.add('matched');
    matchedCount += 2;
    resetTurn();

    if (matchedCount === cards.length) {
        stopTimer();
        setTimeout(showWinModal, 500);
    }
}

function unflipCards() {
    setTimeout(() => {
        flippedCards[0].classList.remove('flipped');
        flippedCards[1].classList.remove('flipped');
        resetTurn();
    }, 1000);
}

function resetTurn() {
    flippedCards = [];
    isLockBoard = false;
}

function showWinModal() {
    finalTimeDisplay.textContent = currentTime;
    winModal.style.display = 'flex';
    fetchRanking(currentLevel); // Carrega o ranking no modal
}

function setDifficulty(level) {
    currentLevel = level;
    diffBtns.forEach(btn => {
        if (btn.dataset.level === level) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    initGame();
}

async function saveScore() {
    if (!currentPlayer) {
        saveMessage.textContent = 'Erro: Jogador não identificado.';
        return;
    }

    try {
        const response = await fetch('/api/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: currentPlayer,
                difficulty: currentLevel,
                time_taken: currentTime
            })
        });

        if (response.ok) {
            console.log('Score salvo com sucesso:', currentPlayer, currentLevel, currentTime);
            saveMessage.textContent = `Pontuação de ${currentPlayer} salva!`;
            saveScoreBtn.disabled = true;
            saveScoreBtn.textContent = 'Salvo!';
            // Atualiza o ranking para a dificuldade atual para o usuário ver sua pontuação
            updateRankFilter(currentLevel);
        } else {
            console.error('Falha ao salvar score:', response.status);
            saveMessage.textContent = 'Erro ao salvar pontuação.';
        }
    } catch (error) {
        console.error('Network error:', error);
        saveMessage.textContent = 'Erro de conexão com o servidor.';
    }
}

// Event Listeners
resetBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', initGame);
saveScoreBtn.addEventListener('click', saveScore);

soundToggleBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    bgMusic.muted = isMuted;
    soundToggleBtn.textContent = isMuted ? '🔇' : '🔊';
});

function startAudio() {
    bgMusic.volume = 0.5;
    const playPromise = bgMusic.play();

    if (playPromise !== undefined) {
        playPromise.then(_ => {
            audioStarted = true;
            console.log("Áudio iniciado com sucesso");
        }).catch(error => {
            console.log("Autoplay bloqueado ou erro no áudio:", error);
            // Tenta tocar novamente no próximo clique se falhar
            audioStarted = false;
        });
    }
}

changePlayerBtn.addEventListener('click', () => {
    winModal.style.display = 'none';
    gameContainer.style.display = 'none';
    startScreen.style.display = 'none'; // Mudança para garantir que o login apareça
    loginScreen.style.display = 'flex';
    currentPlayer = '';
    fetchRanking(currentRankDifficulty); // Refresh ranking
});

diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setDifficulty(btn.dataset.level);
    });
});

// Initial Fetch
fetchRanking('medium');
