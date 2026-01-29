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
const logoutBtn = document.getElementById('logout-btn');
const exitGameBtn = document.getElementById('exit-game-btn');

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
let currentUserId = null;
let currentPlayer = '';

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

// Ranking Logic (LocalStorage)
function getLocalScores() {
    return JSON.parse(localStorage.getItem('game_scores') || '[]');
}

function saveLocalScore(scoreData) {
    const scores = getLocalScores();
    scores.push(scoreData);
    localStorage.setItem('game_scores', JSON.stringify(scores));
}

function fetchRanking(difficulty) {
    // Simulate async if needed, but synchronous is fine for localStorage
    const scores = getLocalScores();
    const filtered = scores
        .filter(s => s.difficulty === difficulty)
        .sort((a, b) => a.time_taken - b.time_taken)
        .slice(0, 5);

    renderRanking(filtered);
}

function renderRanking(data) {
    console.log('Dados do ranking (local) atualizados:', data);

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

// Auth Logic (LocalStorage)
function getLocalUsers() {
    return JSON.parse(localStorage.getItem('game_users') || '[]');
}

function saveLocalUser(user) {
    const users = getLocalUsers();
    users.push(user);
    localStorage.setItem('game_users', JSON.stringify(users));
}

function handleAuth(type) {
    const username = authUsernameInput.value.trim();
    const password = authPasswordInput.value.trim();

    if (!username || !password) {
        authMessage.textContent = 'Preencha todos os campos.';
        return;
    }

    const users = getLocalUsers();

    if (type === 'register') {
        const existing = users.find(u => u.username === username);
        if (existing) {
            authMessage.style.color = '#ff4757';
            authMessage.textContent = 'Usuário já existe.';
            return;
        }

        const newUser = {
            id: Date.now(),
            username,
            password
        };
        saveLocalUser(newUser);

        authMessage.style.color = 'var(--accent-color)';
        authMessage.textContent = 'Registrado! Entrando...';
        setTimeout(() => {
            // Auto login after register
            loginSuccess(newUser);
        }, 1000);

    } else {
        // Login
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            loginSuccess(user);
        } else {
            authMessage.style.color = '#ff4757';
            authMessage.textContent = 'Usuário ou senha incorretos.';
        }
    }
}

function loginSuccess(user) {
    authMessage.style.color = 'var(--accent-color)';
    authMessage.textContent = 'Sucesso!';
    currentPlayer = user.username;
    currentUserId = user.id;
    userDisplay.textContent = currentPlayer;

    // Save session
    localStorage.setItem('game_current_user', JSON.stringify(user));

    setTimeout(() => {
        loginScreen.style.display = 'none';
        startScreen.style.display = 'flex';
        authMessage.textContent = '';
    }, 500);
}

// Auto-login check
window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('game_current_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            currentPlayer = user.username;
            currentUserId = user.id;
            userDisplay.textContent = currentPlayer;
            loginScreen.style.display = 'none';
            startScreen.style.display = 'flex';
        } catch (e) {
            console.error('Erro ao restaurar sessão', e);
        }
    }
    fetchRanking('medium');
});

loginBtn.addEventListener('click', () => handleAuth('login'));
registerBtn.addEventListener('click', () => handleAuth('register'));

// Start Screen Logic
startGameBtn.addEventListener('click', () => {
    if (currentPlayer) {
        console.log('Iniciando jogo com o nome:', currentPlayer);
        startScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        startAudio(); // Garante que o áudio comece na interação do usuário
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

// Save Score Logic (LocalStorage)
function saveScore() {
    if (!currentPlayer) {
        saveMessage.textContent = 'Erro: Jogador não identificado.';
        return;
    }

    const scoreData = {
        userId: currentUserId,
        name: currentPlayer,
        difficulty: currentLevel,
        time_taken: currentTime,
        date: new Date().toISOString()
    };

    try {
        saveLocalScore(scoreData);
        console.log('Score salvo localmente:', currentPlayer, currentLevel, currentTime);
        saveMessage.textContent = `Pontuação de ${currentPlayer} salva!`;
        saveScoreBtn.disabled = true;
        saveScoreBtn.textContent = 'Salvo!';
        // Atualiza o ranking para a dificuldade atual
        updateRankFilter(currentLevel);
    } catch (error) {
        console.error('Erro ao salvar localmente:', error);
        saveMessage.textContent = 'Erro ao salvar pontuação.';
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

exitGameBtn.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja sair do jogo atual? Seu progresso será perdido.')) {
        stopTimer();
        gameActive = false;
        gameContainer.style.display = 'none';
        startScreen.style.display = 'flex';
        // Reinicia a tela de início se necessário
        fetchRanking(currentRankDifficulty);
    }
});

logoutBtn.addEventListener('click', () => {
    startScreen.style.display = 'none';
    loginScreen.style.display = 'flex';
    currentPlayer = '';
    authUsernameInput.value = '';
    authPasswordInput.value = '';
    authMessage.textContent = '';
    localStorage.removeItem('game_current_user');
});

// Initial Fetch
// Initial Fetch call handled in window.load

