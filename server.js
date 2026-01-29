const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

// Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
    next();
});

// Database Setup
const db = new sqlite3.Database('game.db', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            created_at TEXT
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela users:', err.message);
            } else {
                console.log('Tabela users pronta.');
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT,
            difficulty TEXT,
            time_taken INTEGER,
            date TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`, (err) => {
            if (err) {
                console.error('Error creating table', err);
            }
        });

        // Seed Dummy Data if empty
        db.get("SELECT count(*) as count FROM scores", (err, row) => {
            if (row.count === 0) {
                console.log("Seeding dummy data...");
                const dummyData = [
                    { name: 'Alice', difficulty: 'easy', time_taken: 30 },
                    { name: 'Bob', difficulty: 'easy', time_taken: 45 },
                    { name: 'Charlie', difficulty: 'medium', time_taken: 60 },
                    { name: 'Diana', difficulty: 'medium', time_taken: 85 },
                    { name: 'Evan', difficulty: 'hard', time_taken: 120 },
                    { name: 'Fiona', difficulty: 'hard', time_taken: 150 },
                    { name: 'Flash', difficulty: 'easy', time_taken: 25 },
                    { name: 'Turbo', difficulty: 'medium', time_taken: 55 },
                    { name: 'Sonic', difficulty: 'hard', time_taken: 100 },
                    { name: 'Slowpoke', difficulty: 'easy', time_taken: 180 }
                ];

                const stmt = db.prepare('INSERT INTO scores (name, difficulty, time_taken, date) VALUES (?, ?, ?, ?)');
                const date = new Date().toISOString();
                dummyData.forEach(d => {
                    stmt.run(d.name, d.difficulty, d.time_taken, date);
                });
                stmt.finalize();
            }
        });
    }
});

// API Routes

// User Registration
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    console.log(`Tentativa de registro: ${username}`);
    const date = new Date().toISOString();

    if (!username || !password) {
        console.log('Registro falhou: Campos faltando');
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const stmt = db.prepare('INSERT INTO users (username, password, created_at) VALUES (?, ?, ?)');
    stmt.run(username, password, date, function (err) {
        if (err) {
            console.error('Erro no registro BD:', err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Usuário já existe' });
            }
            return res.status(500).json({ error: 'Failed to register' });
        }
        console.log(`Usuário cadastrado: ${username}`);
        res.json({ message: 'Registrado com sucesso!', id: this.lastID });
    });
    stmt.finalize();
});

// User Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`Tentativa de login: ${username}`);

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) {
            console.error('Erro no login BD:', err);
            return res.status(500).json({ error: 'Failed to login' });
        }
        if (!row) {
            console.log(`Login falhou: Credenciais inválidas para ${username}`);
            return res.status(401).json({ error: 'Usuário ou senha incorretos' });
        }
        console.log(`Login bem-sucedido: ${username}`);
        res.json({
            message: 'Login realizado!',
            userId: row.id,
            username: row.username
        });
    });
});

// Save Score
app.post('/api/score', (req, res) => {
    const { userId, name, difficulty, time_taken } = req.body;
    console.log(`Tentativa de salvar score para ID ${userId}: ${name}, ${difficulty}, ${time_taken}s`);
    const date = new Date().toISOString();

    if (!userId || !name || !difficulty || !time_taken && time_taken !== 0) {
        console.log('Score falhou: Campos faltando');
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const stmt = db.prepare('INSERT INTO scores (user_id, name, difficulty, time_taken, date) VALUES (?, ?, ?, ?, ?)');
    stmt.run(userId, name, difficulty, time_taken, date, function (err) {
        if (err) {
            console.error('Erro ao salvar score BD:', err.message);
            return res.status(500).json({ error: 'Failed to save score' });
        }
        console.log(`Score salvo! ID: ${this.lastID}`);
        res.json({ message: 'Score saved successfully!', id: this.lastID });
    });
    stmt.finalize();
});

// Get Ranking (Top 5)
app.get('/api/ranking', (req, res) => {
    const difficulty = req.query.difficulty || 'medium';
    db.all(`SELECT name, time_taken, date FROM scores WHERE difficulty = ? ORDER BY time_taken ASC LIMIT 5`, [difficulty], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to retrieve ranking' });
        }
        res.json(rows);
    });
});

// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
