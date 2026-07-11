const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

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

// --- DATABASE HYBRID LAYER ---
const usePostgres = !!process.env.DATABASE_URL;
let pgPool = null;

if (usePostgres) {
  console.log("DATABASE_URL detected. Configuring Cloud Postgres connection...");
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for serverless Neon/Supabase connections
    }
  });

  // Test connection & initialize tables
  pgPool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Cloud Postgres Connection Error:', err.message);
    } else {
      console.log('Successfully connected to Production Cloud Postgres Database.');
      initializePostgresTables();
    }
  });
} else {
  console.log("No DATABASE_URL detected. Using local JSON File Database.");
}

// Local JSON File Database configuration
const dbFile = path.join(__dirname, '../database.json');

function readLocalDb() {
  try {
    if (!fs.existsSync(dbFile)) {
      const initialData = { users: [], ideas: [] };
      fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2), 'utf8');
      return initialData;
    }
    const raw = fs.readFileSync(dbFile, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading JSON database:', err);
    return { users: [], ideas: [] };
  }
}

function writeLocalDb(data) {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to JSON database:', err);
  }
}

function initializePostgresTables() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
  `;
  const createIdeasTable = `
    CREATE TABLE IF NOT EXISTS ideas (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      encrypted_payload TEXT NOT NULL,
      iv VARCHAR(255) NOT NULL,
      salt VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  pgPool.query(createUsersTable)
    .then(() => pgPool.query(createIdeasTable))
    .then(() => console.log('PostgreSQL database tables verified.'))
    .catch(err => console.error('Error creating Postgres tables:', err.message));
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
    if (usePostgres) {
      pgPool.query('SELECT username FROM users WHERE id = $1', [req.session.userId], (err, result) => {
        if (err || result.rows.length === 0) {
          return res.json({ loggedIn: false });
        }
        res.json({ loggedIn: true, username: result.rows[0].username });
      });
    } else {
      const db = readLocalDb();
      const user = db.users.find(u => u.id === req.session.userId);
      if (!user) return res.json({ loggedIn: false });
      res.json({ loggedIn: true, username: user.username });
    }
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

  bcrypt.hash(authHash, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error during hashing' });
    }

    if (usePostgres) {
      pgPool.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
        [username, hash],
        (err, result) => {
          if (err) {
            if (err.message.includes('unique constraint') || err.message.includes('duplicate key')) {
              return res.status(400).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: 'Database error registering user' });
          }
          req.session.userId = result.rows[0].id;
          res.json({ success: true, username });
        }
      );
    } else {
      const db = readLocalDb();
      const existingUser = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const newUser = {
        id: db.users.length + 1,
        username: username,
        password_hash: hash
      };

      db.users.push(newUser);
      writeLocalDb(db);

      req.session.userId = newUser.id;
      res.json({ success: true, username });
    }
  });
});

// 3. Login
app.post('/api/login', (req, res) => {
  const { username, authHash } = req.body;

  if (!username || !authHash) {
    return res.status(400).json({ error: 'Username and credentials required' });
  }

  if (usePostgres) {
    pgPool.query('SELECT id, password_hash FROM users WHERE username = $1', [username], (err, result) => {
      if (err || result.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid username or password' });
      }

      const user = result.rows[0];
      bcrypt.compare(authHash, user.password_hash, (err, matches) => {
        if (err || !matches) {
          return res.status(400).json({ error: 'Invalid username or password' });
        }

        req.session.userId = user.id;
        res.json({ success: true, username });
      });
    });
  } else {
    const db = readLocalDb();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    bcrypt.compare(authHash, user.password_hash, (err, matches) => {
      if (err || !matches) {
        return res.status(400).json({ error: 'Invalid username or password' });
      }

      req.session.userId = user.id;
      res.json({ success: true, username });
    });
  }
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

  if (usePostgres) {
    pgPool.query(
      'INSERT INTO ideas (user_id, encrypted_payload, iv, salt) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.session.userId, encrypted_payload, iv, salt],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to save encrypted idea' });
        }
        res.json({ success: true, id: result.rows[0].id });
      }
    );
  } else {
    const db = readLocalDb();
    const newIdea = {
      id: db.ideas.length + 1,
      user_id: req.session.userId,
      encrypted_payload: encrypted_payload,
      iv: iv,
      salt: salt,
      created_at: new Date().toISOString()
    };

    db.ideas.push(newIdea);
    writeLocalDb(db);

    res.json({ success: true, id: newIdea.id });
  }
});

// 6. Fetch Encrypted Ideas for logged-in user
app.get('/api/ideas', requireAuth, (req, res) => {
  if (usePostgres) {
    pgPool.query(
      'SELECT id, encrypted_payload, iv, salt, created_at FROM ideas WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.userId],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch encrypted ideas' });
        }
        res.json(result.rows);
      }
    );
  } else {
    const db = readLocalDb();
    const userIdeas = db.ideas
      .filter(i => i.user_id === req.session.userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
    res.json(userIdeas);
  }
});

// Database Inspector Endpoint (for Hackathon Demo Verification)
app.get('/admin/db', async (req, res) => {
  let users = [];
  let ideas = [];

  try {
    if (usePostgres) {
      const usersRes = await pgPool.query('SELECT id, username, password_hash FROM users');
      const ideasRes = await pgPool.query('SELECT id, user_id, encrypted_payload, iv, salt, created_at FROM ideas');
      users = usersRes.rows;
      ideas = ideasRes.rows;
    } else {
      const db = readLocalDb();
      users = db.users || [];
      ideas = db.ideas || [];
    }
  } catch (err) {
    console.error('Error fetching inspector records:', err);
  }
  
  // Generate a simple, beautiful HTML page
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>DecisionVerse — Zero-Knowledge Database Inspector</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Source+Code+Pro:wght@400;600&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Outfit', sans-serif; background-color: #FBF9F6; color: #0F0B1C; padding: 40px; }
        h1 { font-size: 28px; margin-bottom: 8px; }
        p { color: #5C586B; margin-bottom: 30px; }
        .badge { background-color: #10B981; color: white; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .badge.red { background-color: #EF4444; }
        .table-container { background: white; border: 1px solid rgba(15, 11, 28, 0.08); border-radius: 12px; padding: 24px; margin-bottom: 40px; box-shadow: 0 4px 12px rgba(15, 11, 28, 0.02); }
        h2 { font-size: 20px; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
        table { width: 100%; border-collapse: collapse; text-align: left; }
        th, td { padding: 12px; border-bottom: 1px solid rgba(15, 11, 28, 0.05); font-size: 14px; }
        th { font-weight: 700; color: #5C586B; }
        td.code { font-family: 'Source Code Pro', monospace; font-size: 12px; word-break: break-all; color: #4B5563; }
        .nav-link { color: #2563EB; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 20px; }
        .nav-link:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <a href="/" class="nav-link">← Back to Simulator</a>
      <h1>Zero-Knowledge Database Inspector (${usePostgres ? 'Cloud Postgres Mode' : 'Local File Mode'})</h1>
      <p>This panel displays the raw database records stored on the server. Notice that all user passwords and startup ideas are fully encrypted/hashed before they hit the database.</p>
      
      <div class="table-container">
        <h2>Users Table <span class="badge red">Double-Hashed (Client SHA256 + Server Bcrypt)</span></h2>
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">User ID</th>
              <th style="width: 150px;">Username</th>
              <th>Bcrypt Hashed Password (Auth Key)</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${u.id}</td>
                <td><strong>${u.username}</strong></td>
                <td class="code">${u.password_hash}</td>
              </tr>
            `).join('')}
            ${users.length === 0 ? '<tr><td colspan="3" style="text-align:center; color:#5C586B;">No user accounts created yet.</td></tr>' : ''}
          </tbody>
        </table>
      </div>

      <div class="table-container">
        <h2>Ideas Table <span class="badge">Encrypted (Client AES-256-GCM Ciphertext)</span></h2>
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Idea ID</th>
              <th style="width: 80px;">User ID</th>
              <th>Encrypted Payload (Ciphertext)</th>
              <th style="width: 120px;">Initialization Vector (IV)</th>
              <th style="width: 150px;">Salt (Owner)</th>
              <th style="width: 180px;">Created At</th>
            </tr>
          </thead>
          <tbody>
            ${ideas.map(i => `
              <tr>
                <td>${i.id}</td>
                <td>${i.user_id}</td>
                <td class="code" style="color: #059669;">${i.encrypted_payload}</td>
                <td class="code">${i.iv}</td>
                <td>${i.salt}</td>
                <td>${new Date(i.created_at).toLocaleString()}</td>
              </tr>
            `).join('')}
            ${ideas.length === 0 ? '<tr><td colspan="6" style="text-align:center; color:#5C586B;">No ideas encrypted & saved yet.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

// Serve frontend static assets from parent project directory (running locally)
app.use(express.static(path.join(__dirname, '../')));

// Direct fallback to index.html for clients
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.listen(PORT, () => {
  console.log(`DecisionVerse server listening on port ${PORT}`);
});
