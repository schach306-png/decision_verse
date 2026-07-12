const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Session management
app.use(cookieSession({
  name: 'decisionverse_session',
  keys: ['hackathon_secret_key_session_2026'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// --- Middleware: Require Auth ---
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// --- API Endpoints ---

// 1. Check Session State
app.get('/api/me', async (req, res) => {
  if (req.session && req.session.userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.session.userId }
      });
      if (!user) {
        return res.json({ loggedIn: false });
      }
      res.json({ loggedIn: true, username: user.username });
    } catch (err) {
      console.error('Session check failed:', err);
      res.json({ loggedIn: false });
    }
  } else {
    res.json({ loggedIn: false });
  }
});

// 2. Signup
app.post('/api/signup', async (req, res) => {
  const { username, authHash } = req.body;

  if (!username || !authHash) {
    return res.status(400).json({ error: 'Username and auth credentials required' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hash = await bcrypt.hash(authHash, 10);
    const newUser = await prisma.user.create({
      data: {
        username: username,
        password_hash: hash
      }
    });

    req.session.userId = newUser.id;
    res.json({ success: true, username });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Database error registering user' });
  }
});

// 3. Login
app.post('/api/login', async (req, res) => {
  const { username, authHash } = req.body;

  if (!username || !authHash) {
    return res.status(400).json({ error: 'Username and credentials required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const matches = await bcrypt.compare(authHash, user.password_hash);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    req.session.userId = user.id;
    res.json({ success: true, username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error during login' });
  }
});

// 4. Logout
app.post('/api/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

// 5. Save Encrypted Idea
app.post('/api/ideas', requireAuth, async (req, res) => {
  const { encrypted_payload, iv, salt } = req.body;

  if (!encrypted_payload || !iv || !salt) {
    return res.status(400).json({ error: 'Encrypted payload, iv, and salt are required' });
  }

  try {
    const newIdea = await prisma.idea.create({
      data: {
        user_id: req.session.userId,
        encrypted_payload,
        iv,
        salt
      }
    });
    res.json({ success: true, id: newIdea.id });
  } catch (err) {
    console.error('Save idea error:', err);
    res.status(500).json({ error: 'Failed to save encrypted idea' });
  }
});

// 6. Fetch Encrypted Ideas for logged-in user
app.get('/api/ideas', requireAuth, async (req, res) => {
  try {
    const userIdeas = await prisma.idea.findMany({
      where: { user_id: req.session.userId },
      orderBy: { created_at: 'desc' }
    });
    res.json(userIdeas);
  } catch (err) {
    console.error('Fetch ideas error:', err);
    res.status(500).json({ error: 'Failed to fetch encrypted ideas' });
  }
});

// Database Inspector Endpoint (for Hackathon Demo Verification)
app.get('/admin/db', async (req, res) => {
  let users = [];
  let ideas = [];

  try {
    users = await prisma.user.findMany() || [];
    ideas = await prisma.idea.findMany() || [];
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
      <h1>Zero-Knowledge Database Inspector (Prisma Mode)</h1>
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
