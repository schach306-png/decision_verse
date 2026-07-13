# DecisionVerse

**The flight simulator for startup founders.**

Build your startup before you build it in real life.

[Live Demo](https://decisionversehack.vercel.app/) · [Database Verification Panel](https://decisionversehack.vercel.app/admin/db) · [Demo Video](#) · [Presentation](#)

---

## The Problem

First-time founders make some of the highest-stakes financial decisions of their lives: pricing, hiring, burn rate, fundraising, all with no formal training and no room for error. There's no practice run. A bad call isn't a lesson, it's a dent in real capital, and by the time it shows up in the numbers, the damage is already done.

90% of first-time founders have no formal financial literacy training. They're not failing because their ideas are bad. They're failing because no one ever let them practice first.

## The Solution

DecisionVerse is a high-fidelity flight simulator for running a SaaS business, a place where founders can make every high-stakes decision first, before a single dollar is actually at risk.

Describe your startup idea, and DecisionVerse builds a live financial digital twin of it, a running simulation that reacts to every choice you make, month by month, the same way a real business would.

## Key Features

### 1. Deterministic Financial Math Engine
Every choice runs through a real financial model: monthly customer cohorts, MRR growth, operating expenses, capital burn, and runway, all calculated using real-world SaaS benchmarks. Nothing is hand-waved. Every decision has a consequence you can actually see reflected in cash balance, revenue, and runway.

### 2. Multi-Agent AI Boardroom
A simulated Board of Directors, with autonomous CEO, CFO, and Investor agents, debates your monthly choices in real time. Each agent reasons from its own perspective: growth, budget discipline, or return on capital, the same way a real board would push back and force you to defend your reasoning.

### 3. Behavioral Bias Detector Agent
Runs alongside the Board, watching your decision patterns over time to flag cognitive biases, like overconfidence or loss aversion, before they calcify into expensive habits.

### 4. What-If Scenario Engine
Stress-test any scenario on demand: a competitor entering the market, a recession, viral growth, or a custom scenario you type in yourself. Watch your financial model react instantly.

### 5. Zero-Knowledge Privacy Architecture
Every startup idea and every password is encrypted before it ever leaves the browser. Passwords are hashed with Bcrypt. Startup data is encrypted with AES-GCM. The server stores only ciphertext and never has visibility into raw user data, a claim you can verify yourself on the live [Database Verification Panel](https://decisionversehack.vercel.app/admin/db).

## System Architecture

```
CLIENT
  HTML5, CSS3, JavaScript, Web Crypto API (client-side encryption)
        |
        v
APPLICATION
  Node.js + Express (REST API & routing)
        |
        v
ORM & SCHEMA
  Prisma ORM (type-safe models & migrations)
        |
        v
SECURITY
  Bcrypt (password hashing) · AES-GCM (data encryption) · Zero-knowledge design
        |
        v
DATA
  PostgreSQL (encrypted persistent storage)
```

Data flows top-down: the browser encrypts locally, Express handles requests, Prisma maps them to typed models, the security layer enforces hashing and encryption, and PostgreSQL stores only ciphertext.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js, Express |
| ORM | Prisma |
| Database | PostgreSQL |
| Security | Bcrypt, AES-GCM, Web Crypto API |
| Deployment | Render (backend), Vercel (frontend) |

## Deployment

The backend Node.js/Express server is deployed on **Render**, connected directly to this GitHub repository for continuous integration. Render serves the API endpoints and routes traffic to a cloud-hosted PostgreSQL instance for all persistent database queries. The frontend is deployed on **Vercel**.

## Getting Started

```bash
# Clone the repository
git clone https://github.com/schach306-png/decision_verse.git
cd decision_verse

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your DATABASE_URL and any required secrets

# Run Prisma migrations
npx prisma migrate dev

# Start the server
node app.js
```

The app will be available at `http://localhost:3000` (or your configured port).

## Project Structure

```
decision_verse/
├── api/              # Backend route handlers
├── prisma/           # Prisma schema and migrations
├── index.html        # Frontend entry point
├── styles.css        # Frontend styling
├── app.js            # Express server entry point
├── vercel.json        # Vercel deployment config
├── .env.example       # Environment variable template
└── package.json
```

## Verifying Zero-Knowledge Security

Visit the live [Database Verification Panel](https://decisionversehack.vercel.app/admin/db) to inspect the raw database directly. You'll see that:
- Passwords are stored as secure Bcrypt hashes
- Startup ideas and simulation states are stored as AES-GCM ciphertext

This confirms the server has zero visibility into raw user data at any point.

## Team

Built for **Hackhazards 2026** by:
- Subhasree Majumder
- Subham Gupta
- Ranish Dutta
- Anushka Ghosh

## Tags

`HTML5` `CSS3` `JavaScript` `Node.js` `Express` `Prisma ORM` `Web Crypto API` `PostgreSQL` `Cryptography`

## Themes

- Work, Finance & Digital Economy
- Trust, Identity & Security

---

*Your startup, before you build it.*
