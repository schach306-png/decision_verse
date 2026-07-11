const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Session management
app.use(cookieSession({
  name: 'decisionverse_session',
  keys: ['hackathon_secret_key_session_2026'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Initialize Database
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to local SQLite database.');
    createTables();
  }
});

function createTables() {
  db.serialize(() => {
    // Users table: password_hash stores a bcrypt hash of the client's generated Auth Hash
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )`);

    // Ideas table: encrypted_payload is a ciphertext string encrypted client-side (AES-GCM)
    db.run(`CREATE TABLE IF NOT EXISTS ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      encrypted_payload TEXT NOT NULL,
      iv TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
  });
}

// --- Middleware: Require Auth ---
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// --- API Endpoints ---

// 1. Check Session State
app.get('/api/me', (req, res) => {
  if (req.session && req.session.userId) {
    db.get('SELECT username FROM users WHERE id = ?', [req.session.userId], (err, user) => {
      if (err || !user) {
        return res.json({ loggedIn: false });
      }
      res.json({ loggedIn: true, username: user.username });
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// 2. Signup
app.post('/api/signup', (req, res) => {
  const { username, authHash } = req.body;

  if (!username || !authHash) {
    return res.status(400).json({ error: 'Username and auth credentials required' });
  }

  // Hash the incoming authHash (derived client-side) on server-side for double security
  bcrypt.hash(authHash, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error during hashing' });
    }

    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Database error registering user' });
      }

      // Log the user in immediately
      req.session.userId = this.lastID;
      res.json({ success: true, username });
    });
  });
});

// 3. Login
app.post('/api/login', (req, res) => {
  const { username, authHash } = req.body;

  if (!username || !authHash) {
    return res.status(400).json({ error: 'Username and credentials required' });
  }

  db.get('SELECT id, password_hash FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    bcrypt.compare(authHash, user.password_hash, (err, matches) => {
      if (err || !matches) {
        return res.status(400).json({ error: 'Invalid username or password' });
      }

      req.session.userId = user.id;
      res.json({ success: true, username });
    });
  });
});

// 4. Logout
app.post('/api/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

// 5. Save Encrypted Idea
app.post('/api/ideas', requireAuth, (req, res) => {
  const { encrypted_payload, iv, salt } = req.body;

  if (!encrypted_payload || !iv || !salt) {
    return res.status(400).json({ error: 'Encrypted payload, iv, and salt are required' });
  }

  db.run('INSERT INTO ideas (user_id, encrypted_payload, iv, salt) VALUES (?, ?, ?, ?)',
    [req.session.userId, encrypted_payload, iv, salt],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save encrypted idea' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// 6. Fetch Encrypted Ideas for logged-in user
app.get('/api/ideas', requireAuth, (req, res) => {
  db.all('SELECT id, encrypted_payload, iv, salt, created_at FROM ideas WHERE user_id = ? ORDER BY created_at DESC',
    [req.session.userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch encrypted ideas' });
      }
      res.json(rows);
    }
  );
});

// Serve frontend static assets from project directory
app.use(express.static(__dirname));

// Direct fallback to index.html for clients
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DecisionVerse server listening on port ${PORT}`);
});
