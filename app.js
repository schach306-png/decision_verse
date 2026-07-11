// ==========================================
// DECISIONVERSE CORE ENGINE
// Deterministic Math + Semantic Multi-Agent Debate
// Zero-Knowledge Web Crypto Authentication & Storage
// ==========================================

// --- State Variables ---
let state = {
  startupName: "AI Tutor Co.",
  month: 1,
  cash: 100000,
  customers: 500,
  price_per_user: 20,
  cac: 50,
  churn_rate: 0.05,
  fixed_costs: 10000,
  marketing_spend: 2000,
  history: [], // Elements: { month, cash, mrr }
  decisionHistory: [] // Array of 'YES' or 'NO' values for bias detection
};

// Global variables for auth and encryption keys
let activeEncryptionKey = null;
let currentUsername = "";
let authMode = "login"; // "login" or "signup"

// Sector Benchmarks (SaaS Sector reference)
const BENCHMARKS = {
  cac_median: 60,
  churn_median: 0.06,
  runway_critical: 6 // months
};

// Preset Dilemmas for each month
const DILEMMAS = {
  1: {
    title: "Increase Subscription Pricing by 15%?",
    description: "Raising pricing from $20 to $23 will boost revenue per customer immediately. However, it risks alienating current price-sensitive users and raising our churn rate.",
    yes_preview: "Set pricing to $23. (Raises Churn to 8%)",
    no_preview: "Keep pricing at $20. (Churn stays at 5%)",
    applyYes: () => {
      state.price_per_user = 23;
      state.churn_rate = 0.08;
    },
    applyNo: () => {
      state.price_per_user = 20;
      state.churn_rate = 0.05;
    }
  },
  2: {
    title: "Double the Marketing Budget?",
    description: "Adding $4,000 to our monthly marketing spend will let us run highly optimized search ads. This will accelerate customer growth and drop our CAC by $5 due to ad scaling.",
    yes_preview: "Spend $6,000 on Marketing. (CAC falls to $45)",
    no_preview: "Spend $2,000 on Marketing. (CAC stays $50)",
    applyYes: () => {
      state.marketing_spend = 6000;
      state.cac = 45;
    },
    applyNo: () => {
      state.marketing_spend = 2000;
      state.cac = 50;
    }
  },
  3: {
    title: "Hire 2 Senior Full-stack Engineers?",
    description: "The product team is lagging on feature delivery. Hiring them adds $15,000/mo to fixed costs but decreases product bugs (reducing churn to 4%).",
    yes_preview: "Hire them. (Fixed Costs +$15,000, Churn falls to 4%)",
    no_preview: "Postpone hiring. (Churn rises to 7% due to system fatigue)",
    applyYes: () => {
      state.fixed_costs += 15000;
      state.churn_rate = 0.04;
    },
    applyNo: () => {
      state.churn_rate = 0.07;
    }
  },
  4: {
    title: "Raise $150k Seed Bridge Funding?",
    description: "An angel group offers $150,000 cash for 15% equity. This dramatically extends runway, but dilutes ownership and pressures us to show immediate hyper-growth.",
    yes_preview: "Accept funding. (Cash +$150,000)",
    no_preview: "Decline and bootstrap. (No equity dilution)",
    applyYes: () => {
      state.cash += 150000;
    },
    applyNo: () => {
      // No adjustments
    }
  },
  5: {
    title: "Outsource Customer Operations?",
    description: "We can replace our in-house support team with a third-party agency. This slashes fixed costs by $4,000/mo but will lower customer satisfaction, raising churn.",
    yes_preview: "Outsource support. (Fixed Costs -$4,000, Churn rises to 10%)",
    no_preview: "Keep internal support. (Fixed Costs unchanged, Churn falls to 5%)",
    applyYes: () => {
      state.fixed_costs = Math.max(2000, state.fixed_costs - 4000);
      state.churn_rate = 0.10;
    },
    applyNo: () => {
      state.churn_rate = 0.05;
    }
  }
};

// Fallback scripts for demo presentation mode
let demoModeActive = false;
let demoStep = 0;
const DEMO_STEPS = [
  {
    month: 1,
    choice: "YES", // Hire engineers
    whatIf: "",
    comment: "Step 1: User hires engineers to scale engineering output. Cash drops."
  },
  {
    month: 2,
    choice: "YES", // Double marketing budget
    whatIf: "",
    comment: "Step 2: Double marketing spend. Growth spikes, but runway is compressed."
  },
  {
    month: 3,
    choice: "NO", // Decline outsourcing
    whatIf: "Google enters the market with a similar free tool", // Trigger Google entry
    comment: "Step 3 Climax: Google competitor enters. CAC doubles and churn spikes. Board debates live."
  }
];

// --- Initialization & Navigation Functions ---
window.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  checkSessionState();
  window.addEventListener("resize", drawChart);
});

function setupEventListeners() {
  // Launch Button
  document.getElementById("btn-launch").addEventListener("click", () => {
    const input = document.getElementById("startup-concept").value.trim();
    if (input) {
      state.startupName = input.length > 30 ? input.substring(0, 30) + "..." : input;
    }
    triggerLoadingScreen();
  });

  // Next Month choices
  document.getElementById("btn-option-yes").addEventListener("click", () => handleDecision("YES"));
  document.getElementById("btn-option-no").addEventListener("click", () => handleDecision("NO"));

  // Restart Button
  document.getElementById("btn-restart").addEventListener("click", resetSimulation);

  // What-If Scenario Form
  document.getElementById("btn-what-if-submit").addEventListener("click", executeWhatIfScenario);
  document.getElementById("what-if-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") executeWhatIfScenario();
  });

  // Quick Preset Buttons
  document.querySelectorAll(".btn-preset").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.getElementById("what-if-input").value = e.target.getAttribute("data-scenario");
      executeWhatIfScenario();
    });
  });

  // Keylistener for Fallback Mode: Ctrl + Shift + D
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyD") {
      e.preventDefault();
      activateDemoMode();
    }
  });

  // --- Login / Signup Modal Event Listeners ---
  document.getElementById("btn-show-login").addEventListener("click", () => showAuthModal("login"));
  document.getElementById("btn-show-signup").addEventListener("click", () => showAuthModal("signup"));
  document.getElementById("btn-close-auth").addEventListener("click", hideAuthModal);
  document.getElementById("auth-toggle-link").addEventListener("click", toggleAuthMode);
  document.getElementById("btn-auth-submit").addEventListener("click", handleAuthSubmit);
  document.getElementById("btn-logout").addEventListener("click", handleLogout);

  // --- Save Modal Event Listeners ---
  document.getElementById("btn-show-save").addEventListener("click", showSaveModal);
  document.getElementById("btn-close-save").addEventListener("click", hideSaveModal);
  document.getElementById("btn-save-submit").addEventListener("click", handleSaveStateSubmit);
}

// --- Zero-Knowledge Cryptography (Web Crypto API AES-256-GCM) ---

// Derives Auth Hash (to verify session) and AES Key (to encrypt/decrypt locally)
async function deriveSecrets(username, password) {
  const encoder = new TextEncoder();
  const salt = encoder.encode(username.toLowerCase()); // Unique salt per username
  
  // Import raw password bytes
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive bits from PBKDF2
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    512 // 512 bits = 64 bytes
  );

  const aesBytes = derivedBits.slice(0, 32); // First 32 bytes for AES
  const authHashBytes = derivedBits.slice(32, 64); // Last 32 bytes for server validation

  // Format authHash as hex string for transportation
  const authHashHex = Array.from(new Uint8Array(authHashBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  // Import AES GCM key
  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    aesBytes,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return { aesKey, authHashHex };
}

// Encrypt plaintext string into ciphertext hex and IV hex
async function encryptData(plaintext, key) {
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte standard GCM IV

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encoder.encode(plaintext)
  );

  const ciphertextHex = Array.from(new Uint8Array(cipherBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const ivHex = Array.from(iv)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return { ciphertextHex, ivHex };
}

// Decrypt ciphertext hex back into plaintext string
async function decryptData(ciphertextHex, ivHex, key) {
  const decoder = new TextDecoder();
  const ciphertextBytes = new Uint8Array(
    ciphertextHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
  );
  const ivBytes = new Uint8Array(
    ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
  );

  const plaintextBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBytes
    },
    key,
    ciphertextBytes
  );

  return decoder.decode(plaintextBuffer);
}

// --- Session & Database API Triggers ---

async function checkSessionState() {
  try {
    const res = await fetch("/api/me");
    const data = await res.json();
    
    if (data.loggedIn) {
      currentUsername = data.username;
      updateAuthUI(true);
      // Retrieve the cached password to derive keys if they refreshed
      // In a strict browser memory environment, if they refresh they must input password again to decrypt,
      // which is a good secure UX indicator. We prompt them to sign in to fetch their twins.
    } else {
      updateAuthUI(false);
    }
  } catch (err) {
    console.error("Auth state check failed:", err);
  }
}

function updateAuthUI(loggedIn) {
  const authSec = document.getElementById("nav-auth-section");
  const userSec = document.getElementById("nav-user-section");
  const saveBtn = document.getElementById("btn-show-save");
  const savedContainer = document.getElementById("saved-ideas-container");

  if (loggedIn) {
    authSec.style.display = "none";
    userSec.style.display = "flex";
    document.getElementById("nav-username").textContent = currentUsername;
    saveBtn.style.display = "inline-block";
    
    if (activeEncryptionKey) {
      savedContainer.style.display = "block";
      fetchAndDecryptIdeas();
    } else {
      savedContainer.style.display = "none";
    }
  } else {
    authSec.style.display = "flex";
    userSec.style.display = "none";
    saveBtn.style.display = "none";
    savedContainer.style.display = "none";
    activeEncryptionKey = null;
    currentUsername = "";
  }
}

function showAuthModal(mode) {
  authMode = mode;
  const modal = document.getElementById("auth-modal");
  const title = document.getElementById("auth-modal-title");
  const submit = document.getElementById("btn-auth-submit");
  const toggleText = document.getElementById("auth-toggle-text");
  const toggleLink = document.getElementById("auth-toggle-link");
  const error = document.getElementById("auth-error-msg");

  error.style.display = "none";
  document.getElementById("auth-username").value = "";
  document.getElementById("auth-password").value = "";

  if (mode === "login") {
    title.textContent = "Sign In";
    submit.textContent = "Sign In";
    toggleText.textContent = "Don't have an account?";
    toggleLink.textContent = "Sign Up";
  } else {
    title.textContent = "Create Account";
    submit.textContent = "Sign Up";
    toggleText.textContent = "Already have an account?";
    toggleLink.textContent = "Sign In";
  }

  modal.style.display = "flex";
}

function hideAuthModal() {
  document.getElementById("auth-modal").style.display = "none";
}

function toggleAuthMode(e) {
  e.preventDefault();
  showAuthModal(authMode === "login" ? "signup" : "login");
}

async function handleAuthSubmit() {
  const username = document.getElementById("auth-username").value.trim();
  const password = document.getElementById("auth-password").value;
  const errorEl = document.getElementById("auth-error-msg");

  if (!username || !password) {
    errorEl.textContent = "All fields are required.";
    errorEl.style.display = "block";
    return;
  }

  errorEl.style.display = "none";

  try {
    // Zero-knowledge key derivation in client memory
    const { aesKey, authHashHex } = await deriveSecrets(username, password);

    const url = authMode === "login" ? "/api/login" : "/api/signup";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, authHash: authHashHex })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      activeEncryptionKey = aesKey;
      currentUsername = username;
      hideAuthModal();
      updateAuthUI(true);
    } else {
      errorEl.textContent = data.error || "Authentication failed.";
      errorEl.style.display = "block";
    }
  } catch (err) {
    console.error("Authentication error:", err);
    errorEl.textContent = "Crypto error: Key derivation failed.";
    errorEl.style.display = "block";
  }
}

async function handleLogout() {
  try {
    await fetch("/api/logout", { method: "POST" });
    updateAuthUI(false);
    resetSimulation();
  } catch (err) {
    console.error("Logout failed:", err);
  }
}

// --- Saving State Dialog Modals ---

function showSaveModal() {
  if (!activeEncryptionKey) {
    alert("You must log in to save your simulation states.");
    return;
  }
  document.getElementById("save-idea-name").value = state.startupName;
  document.getElementById("save-modal").style.display = "flex";
}

function hideSaveModal() {
  document.getElementById("save-modal").style.display = "none";
}

async function handleSaveStateSubmit() {
  const label = document.getElementById("save-idea-name").value.trim();
  if (!label) {
    alert("Please provide a name label.");
    return;
  }

  try {
    // Prepare the payload (state, parameters, history log)
    const payload = JSON.stringify({
      labelName: label,
      state: state
    });

    // Encrypt client-side
    const { ciphertextHex, ivHex } = await encryptData(payload, activeEncryptionKey);

    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encrypted_payload: ciphertextHex,
        iv: ivHex,
        salt: currentUsername.toLowerCase() // Unique salt reference for display
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      hideSaveModal();
      fetchAndDecryptIdeas(); // Reload list on dashboard landing
      alert("Simulation encrypted & stored successfully in database!");
    } else {
      alert("Error saving: " + data.error);
    }
  } catch (err) {
    console.error("Save state error:", err);
    alert("Encryption failed. Verify key bounds.");
  }
}

// Fetch encrypted cards from database and decrypt locally
async function fetchAndDecryptIdeas() {
  const listTable = document.getElementById("ideas-list-table");
  if (!activeEncryptionKey) return;

  try {
    const res = await fetch("/api/ideas");
    if (!res.ok) throw new Error("Failed to fetch ideas");
    const rows = await res.json();

    listTable.innerHTML = "";
    
    if (rows.length === 0) {
      listTable.innerHTML = `<span style="font-size:13px; color:var(--text-muted);">No saved simulation states found. Click 'Save State' inside the dashboard to secure one!</span>`;
      return;
    }

    for (const row of rows) {
      try {
        // Decrypt on the fly using our memory AES key
        const decryptedStr = await decryptData(row.encrypted_payload, row.iv, activeEncryptionKey);
        const data = JSON.parse(decryptedStr);
        
        const card = document.createElement("div");
        card.className = "saved-idea-row";
        
        const dateFormatted = new Date(row.created_at).toLocaleString();
        
        card.innerHTML = `
          <div class="saved-idea-info">
            <span class="saved-idea-name">${data.labelName}</span>
            <span class="saved-idea-meta">Created: ${dateFormatted} | Month: ${data.state.month} | Cash: ${formatCurrency(data.state.cash)}</span>
          </div>
          <div class="saved-idea-actions">
            <button class="btn-secondary btn-load-twin" style="padding: 6px 12px; font-size:12px; font-weight:600;">Decrypt & Launch</button>
          </div>
        `;
        
        card.querySelector(".btn-load-twin").addEventListener("click", () => {
          loadStateIntoSimulator(data.state);
        });

        listTable.appendChild(card);
      } catch (decErr) {
        console.error("Error decrypting row id:", row.id, decErr);
        // Show row as locked or scrambled (representing secure encryption state)
        const card = document.createElement("div");
        card.className = "saved-idea-row scrambled";
        card.innerHTML = `
          <div class="saved-idea-info">
            <span class="saved-idea-name" style="font-family:monospace; color:var(--accent-red)">[CIPHERTEXT SCRUMBLED]</span>
            <span class="saved-idea-meta">Raw bytes: ${row.encrypted_payload.substring(0, 32)}...</span>
          </div>
          <div class="saved-idea-actions">
            <span class="vital-badge badge-red">Locked</span>
          </div>
        `;
        listTable.appendChild(card);
      }
    }
  } catch (err) {
    console.error("Fetch saved ideas error:", err);
    listTable.innerHTML = `<span style="color:var(--accent-red)">Failed to load. Verify database connection.</span>`;
  }
}

function loadStateIntoSimulator(loadedState) {
  // Overwrite state variables
  state = { ...loadedState };

  const landing = document.getElementById("landing-screen");
  const dashboard = document.getElementById("dashboard-screen");

  landing.classList.remove("active");
  dashboard.classList.add("active");

  document.getElementById("display-startup-name").textContent = state.startupName;
  updateUIElements({ cash: 0, mrr: 0, customers: 0 });
  loadDilemma();
  
  // Re-fill the boardroom chat with fresh state
  const feed = document.getElementById("boardroom-chat-feed");
  feed.innerHTML = "";
  generateInitialBoardIntro();
  addBoardroomMessage("SYSTEM", "SYS", "Simulated digital twin decrypted locally in browser and loaded successfully.", "neutral");
  
  drawChart();
}

function triggerLoadingScreen() {
  const landing = document.getElementById("landing-screen");
  const loading = document.getElementById("loading-screen");
  const dashboard = document.getElementById("dashboard-screen");

  landing.classList.remove("active");
  loading.classList.add("active");

  // Step animations on loading screen
  let currentStep = 1;
  const interval = setInterval(() => {
    const stepEl = document.getElementById(`step-${currentStep}`);
    if (stepEl) {
      stepEl.classList.add("completed");
      stepEl.classList.remove("active");
    }
    currentStep++;
    const nextStepEl = document.getElementById(`step-${currentStep}`);
    if (nextStepEl) {
      nextStepEl.classList.add("active");
    } else {
      clearInterval(interval);
      setTimeout(() => {
        loading.classList.remove("active");
        dashboard.classList.add("active");
        initializeDashboard();
      }, 800);
    }
  }, 700);
}

function initializeDashboard() {
  document.getElementById("display-startup-name").textContent = state.startupName;
  
  // Record initial history if empty
  if (state.history.length === 0) {
    state.history = [{
      month: state.month,
      cash: state.cash,
      mrr: calculateMRR()
    }];
  }

  updateUIElements({ cash: 0, mrr: 0, customers: 0 });
  loadDilemma();
  generateInitialBoardIntro();
  drawChart();
}

function resetSimulation() {
  state = {
    startupName: "AI Tutor Co.",
    month: 1,
    cash: 100000,
    customers: 500,
    price_per_user: 20,
    cac: 50,
    churn_rate: 0.05,
    fixed_costs: 10000,
    marketing_spend: 2000,
    history: [],
    decisionHistory: []
  };
  demoModeActive = false;
  demoStep = 0;
  document.getElementById("demo-indicator").classList.remove("active");
  
  // Switch back to landing
  document.getElementById("dashboard-screen").classList.remove("active");
  document.getElementById("landing-screen").classList.add("active");
  document.getElementById("boardroom-chat-feed").innerHTML = "";
  
  // Clean up loader steps
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`step-${i}`);
    el.classList.remove("completed", "active");
  }
  document.getElementById("step-1").classList.add("active");
  document.getElementById("startup-concept").value = "";

  // Check auth session to populate saved lists if logged in
  checkSessionState();
}

// --- Core Calculations (Math Engine) ---
function calculateMRR() {
  return state.customers * state.price_per_user;
}

function calculateExpenses() {
  return state.fixed_costs + state.marketing_spend;
}

function calculateNetBurn() {
  return calculateExpenses() - calculateMRR();
}

function calculateRunway() {
  const netBurn = calculateNetBurn();
  if (netBurn <= 0) return 999; // Profitable, infinite runway
  return state.cash / netBurn;
}

// Monthly Turn Progression
function handleDecision(choice) {
  const previousState = {
    cash: state.cash,
    mrr: calculateMRR(),
    customers: state.customers
  };

  // 1. Record decision
  state.decisionHistory.push(choice);

  // 2. Apply math alterations based on the current month's active dilemma
  const activeDilemma = DILEMMAS[state.month];
  if (activeDilemma) {
    if (choice === "YES") {
      activeDilemma.applyYes();
    } else {
      activeDilemma.applyNo();
    }
  }

  // 3. Run step formulas
  const newCustomers = Math.round(state.marketing_spend / state.cac);
  const churned = Math.round(state.customers * state.churn_rate);
  state.customers = Math.max(0, state.customers + newCustomers - churned);

  const netBurn = calculateNetBurn();
  state.cash -= netBurn;

  // Progress month
  state.month++;

  // 4. Record history
  state.history.push({
    month: state.month,
    cash: state.cash,
    mrr: calculateMRR()
  });

  // Calculate delta highlights
  const deltas = {
    cash: state.cash - previousState.cash,
    mrr: calculateMRR() - previousState.mrr,
    customers: state.customers - previousState.customers
  };

  // 5. Update interface & trigger debates
  updateUIElements(deltas);
  drawChart();
  generateBoardDebate(choice, activeDilemma);
  loadDilemma();
}

// --- What-If Natural Language Parser ---
function executeWhatIfScenario() {
  const inputEl = document.getElementById("what-if-input");
  const query = inputEl.value.trim().toLowerCase();
  if (!query) return;

  // Clear input
  inputEl.value = "";

  // 1. Semantic keyword mapping
  let deltaEffect = {
    fixed_costs_delta: 0,
    cac_multiplier: 1.0,
    churn_rate_delta: 0,
    cash_delta: 0,
    customers_delta: 0,
    mrr_multiplier: 1.0,
    reasoning: "",
    title: "Market Shift"
  };

  if (query.includes("recession") || query.includes("inflation") || query.includes("downturn")) {
    deltaEffect.title = "Macroeconomic Recession";
    deltaEffect.fixed_costs_delta = state.fixed_costs * 0.15; // 15% increase in overheads
    deltaEffect.churn_rate_delta = 0.05; // 5% base churn increase
    deltaEffect.cac_multiplier = 1.2; // Ads cost 20% more due to poor conversions
    deltaEffect.reasoning = "High inflation rates and investor crunch raise operational overheads while consumer budget cuts lead to a massive churn surge.";
  } else if (query.includes("google") || query.includes("competitor") || query.includes("competition")) {
    deltaEffect.title = "Major Competitor Incursion";
    deltaEffect.cac_multiplier = 2.0; // Ad bidding double
    deltaEffect.churn_rate_delta = 0.07; // 7% churn surge
    deltaEffect.reasoning = "A tech giant launched a feature-identical free competitor. Marketing requires double spending to find conversions, and customers are departing.";
  } else if (query.includes("viral") || query.includes("social media") || query.includes("viral surge")) {
    deltaEffect.title = "Organic Growth Spike";
    deltaEffect.customers_delta = 450; // Mass influx
    deltaEffect.cac_multiplier = 0.5; // Viral loops half CAC costs
    deltaEffect.reasoning = "Your startup goes viral on Twitter and LinkedIn. Zero-dollar organic referrals flood the pipeline, dropping customer acquisition unit costs.";
  } else if (query.includes("aws") || query.includes("outage") || query.includes("crash")) {
    deltaEffect.title = "Cloud Infrastructure Outage";
    deltaEffect.cash_delta = -10000; // Refunding SLAs
    deltaEffect.churn_rate_delta = 0.04; // Loss of trust
    deltaEffect.reasoning = "A 24-hour server crash triggers client SLA refunds and causes severe user frustration, prompting customer dropouts.";
  } else if (query.includes("double price")) {
    deltaEffect.title = "Pricing Model Shift";
    state.price_per_user = state.price_per_user * 2;
    deltaEffect.churn_rate_delta = 0.12; // Churn spikes heavily
    deltaEffect.reasoning = "Doubling prices immediately raises cash yields per seat but prompts instant pushback from price-sensitive user cohorts.";
  } else {
    // Default estimated generic scenario delta
    deltaEffect.title = "Unforeseen Market Event";
    deltaEffect.fixed_costs_delta = state.fixed_costs * 0.08;
    deltaEffect.churn_rate_delta = 0.02;
    deltaEffect.reasoning = "This custom scenario forces adjustments to operating overheads and churn projections based on generic SaaS sector response curves.";
  }

  // 2. Apply deltas to state
  const previousState = {
    cash: state.cash,
    mrr: calculateMRR(),
    customers: state.customers
  };

  state.fixed_costs += deltaEffect.fixed_costs_delta;
  state.cac = Math.round(state.cac * deltaEffect.cac_multiplier);
  state.churn_rate = Math.min(0.5, state.churn_rate + deltaEffect.churn_rate_delta);
  state.cash += deltaEffect.cash_delta;
  state.customers = Math.max(0, state.customers + deltaEffect.customers_delta);

  // Trigger mathematical updates
  const deltas = {
    cash: state.cash - previousState.cash,
    mrr: calculateMRR() - previousState.mrr,
    customers: state.customers - previousState.customers
  };

  updateUIElements(deltas);
  drawChart();

  // 3. Render Debate specifically for the What-If event
  generateWhatIfDebate(deltaEffect);
}

// --- Fallback Scripted Pitch Mode (Ctrl+Shift+D) ---
function activateDemoMode() {
  demoModeActive = true;
  demoStep = 0;
  
  // Reset startup for a perfect deterministic demo path
  state = {
    startupName: "Class 10 AI Tutor",
    month: 1,
    cash: 100000,
    customers: 500,
    price_per_user: 20,
    cac: 50,
    churn_rate: 0.05,
    fixed_costs: 10000,
    marketing_spend: 2000,
    history: [],
    decisionHistory: []
  };

  // Show Toast
  const indicator = document.getElementById("demo-indicator");
  indicator.classList.add("active");

  // Instantly load dashboard screen
  document.getElementById("landing-screen").classList.remove("active");
  document.getElementById("loading-screen").classList.remove("active");
  document.getElementById("dashboard-screen").classList.add("active");

  initializeDashboard();

  // Highlight Dilemma and Boardroom to draw the eye
  addBoardroomMessage("SYSTEM", "SYS", "Demo presentation loop loaded. Use standard choices or proceed turn-by-turn.", "neutral");
}

function triggerDemoStep() {
  if (!demoModeActive) return;
  
  const step = DEMO_STEPS[demoStep];
  if (!step) {
    addBoardroomMessage("SYSTEM", "SYS", "Demo loop concluded. Restart the app to run manual tests.", "neutral");
    return;
  }

  // Pre-bake selection
  if (step.whatIf) {
    document.getElementById("what-if-input").value = step.whatIf;
    setTimeout(() => {
      executeWhatIfScenario();
      demoStep++;
    }, 1000);
  } else {
    handleDecision(step.choice);
    demoStep++;
  }
}

// --- UI Rendering Helpers ---
function updateUIElements(deltas) {
  // Update Month Display
  document.getElementById("current-month-display").textContent = `Month ${state.month}`;

  // Cash Value
  const cashEl = document.getElementById("metric-cash");
  cashEl.textContent = formatCurrency(state.cash);
  
  const deltaCashEl = document.getElementById("delta-cash");
  formatDeltaElement(deltaCashEl, deltas.cash, true);

  // MRR Value
  const mrrEl = document.getElementById("metric-mrr");
  mrrEl.textContent = formatCurrency(calculateMRR());
  
  const deltaMrrEl = document.getElementById("delta-mrr");
  formatDeltaElement(deltaMrrEl, deltas.mrr, true);

  // Runway Value
  const runwayVal = calculateRunway();
  const runwayEl = document.getElementById("metric-runway");
  const runwayBar = document.getElementById("runway-bar");
  
  if (runwayVal >= 999) {
    runwayEl.textContent = "Profitable";
    runwayBar.style.width = "100%";
    runwayBar.style.backgroundColor = "var(--accent-green)";
  } else {
    runwayEl.textContent = `${runwayVal.toFixed(1)} months`;
    const pct = Math.min(100, (runwayVal / 18) * 100);
    runwayBar.style.width = `${pct}%`;
    if (runwayVal <= BENCHMARKS.runway_critical) {
      runwayBar.style.backgroundColor = "var(--accent-red)";
    } else {
      runwayBar.style.backgroundColor = "var(--accent-orange)";
    }
  }

  // Customers Value
  const custEl = document.getElementById("metric-customers");
  custEl.textContent = state.customers;
  
  const deltaCustEl = document.getElementById("delta-customers");
  formatDeltaElement(deltaCustEl, deltas.customers, false);

  // CAC Value
  const cacEl = document.getElementById("metric-cac");
  cacEl.textContent = formatCurrency(state.cac);
  const benchmarkEl = document.getElementById("metric-cac-benchmark");
  if (state.cac > BENCHMARKS.cac_median) {
    benchmarkEl.innerHTML = `<span style="color:var(--accent-red)">Crit: Higher than SaaS Med. ($60)</span>`;
  } else {
    benchmarkEl.innerHTML = `<span style="color:var(--accent-green)">Efficient vs. SaaS Med. ($60)</span>`;
  }

  // --- Financial Diagnostics Vitals Sidebar calculations ---
  // 1. LTV : CAC Ratio
  const ltvVal = state.price_per_user / Math.max(0.001, state.churn_rate);
  const ltvCacRatio = ltvVal / Math.max(1, state.cac);
  const ltvValEl = document.getElementById("vital-ltv-cac-val");
  const ltvBadge = document.getElementById("vital-ltv-cac-badge");
  ltvValEl.textContent = `${ltvCacRatio.toFixed(1)}x`;
  
  if (ltvCacRatio >= 3.0) {
    ltvBadge.className = "vital-badge badge-green";
    ltvBadge.textContent = "Excellent";
  } else if (ltvCacRatio >= 1.5) {
    ltvBadge.className = "vital-badge badge-orange";
    ltvBadge.textContent = "Moderate";
  } else {
    ltvBadge.className = "vital-badge badge-red";
    ltvBadge.textContent = "Critical";
  }

  // 2. Net Profit Margin
  const mrr = calculateMRR();
  const expenses = calculateExpenses();
  const netProfit = mrr - expenses;
  const marginPct = mrr > 0 ? (netProfit / mrr) * 100 : 0;
  
  const marginBadge = document.getElementById("vital-margin-badge");
  const marginBar = document.getElementById("vital-margin-bar");
  marginBadge.textContent = `${marginPct.toFixed(0)}%`;
  
  if (marginPct > 15) {
    marginBadge.className = "vital-badge badge-green";
    marginBar.style.backgroundColor = "var(--accent-green)";
  } else if (marginPct >= 0) {
    marginBadge.className = "vital-badge badge-orange";
    marginBar.style.backgroundColor = "var(--accent-orange)";
  } else {
    marginBadge.className = "vital-badge badge-red";
    marginBar.style.backgroundColor = "var(--accent-red)";
  }
  // Progress bar represents margin relative to a typical 50% profit target
  const marginProgressWidth = Math.max(0, Math.min(100, (netProfit > 0 ? (netProfit / mrr) * 100 : 0)));
  marginBar.style.width = `${marginProgressWidth}%`;

  // 3. Capital Burn Efficiency
  const effBadge = document.getElementById("vital-efficiency-badge");
  const effDesc = document.getElementById("vital-efficiency-desc");
  if (netProfit >= 0) {
    effBadge.className = "vital-badge badge-green";
    effBadge.textContent = "Profitable";
    effDesc.textContent = "Excellent cash flow generation. High efficiency.";
  } else if (runwayVal >= 12) {
    effBadge.className = "vital-badge badge-blue";
    effBadge.textContent = "Efficient";
    effDesc.textContent = "Low burn rate with healthy cash buffer (>12 mo).";
  } else if (runwayVal >= 6) {
    effBadge.className = "vital-badge badge-orange";
    effBadge.textContent = "Moderate";
    effDesc.textContent = "Runway is stable but monitors expansion costs.";
  } else {
    effBadge.className = "vital-badge badge-red";
    effBadge.textContent = "Dangerous";
    effDesc.textContent = "Runway is critical (<6 mo). High default probability.";
  }

  // 4. Break-Even Progress
  const breakEvenPctVal = expenses > 0 ? Math.min(100, Math.round((mrr / expenses) * 100)) : 0;
  const breakEvenPctEl = document.getElementById("vital-breakeven-pct");
  const breakEvenBar = document.getElementById("vital-breakeven-bar");
  const breakEvenDesc = document.getElementById("vital-breakeven-desc");
  
  breakEvenPctEl.textContent = `${breakEvenPctVal}%`;
  breakEvenBar.style.width = `${breakEvenPctVal}%`;
  if (breakEvenPctVal >= 100) {
    breakEvenDesc.textContent = "Revenue exceeds fixed operations costs.";
    breakEvenBar.style.backgroundColor = "var(--accent-green)";
  } else {
    breakEvenDesc.textContent = `MRR covers ${breakEvenPctVal}% of monthly operating burn.`;
    breakEvenBar.style.backgroundColor = "var(--accent-blue)";
  }
}

function formatDeltaElement(el, value, isCurrency) {
  if (value > 0) {
    el.className = "metric-delta positive";
    el.textContent = `+${isCurrency ? formatCurrency(value) : value}`;
  } else if (value < 0) {
    el.className = "metric-delta negative";
    el.textContent = `-${isCurrency ? formatCurrency(Math.abs(value)) : Math.abs(value)}`;
  } else {
    el.className = "metric-delta neutral";
    el.textContent = `+$0.00`;
  }
}

function loadDilemma() {
  const currentDilemma = DILEMMAS[state.month];
  const yesBtn = document.getElementById("btn-option-yes");
  const noBtn = document.getElementById("btn-option-no");

  if (currentDilemma) {
    document.getElementById("dilemma-title").textContent = currentDilemma.title;
    document.getElementById("dilemma-description").textContent = currentDilemma.description;
    document.getElementById("yes-preview").textContent = currentDilemma.yes_preview;
    document.getElementById("no-preview").textContent = currentDilemma.no_preview;
    yesBtn.style.display = "flex";
    noBtn.style.display = "flex";
  } else {
    document.getElementById("dilemma-title").textContent = "Market Growth Operations";
    document.getElementById("dilemma-description").textContent = "All strategic seed stages completed. Maintain your current structure, or test custom structural adjustments inside the What-If command bar.";
    yesBtn.style.display = "none";
    noBtn.style.display = "none";
  }
}

function formatCurrency(val) {
  return "$" + Math.round(val).toLocaleString();
}

// --- AI Chat Feed & Debate Generation ---
function addBoardroomMessage(name, role, text, type) {
  const feed = document.getElementById("boardroom-chat-feed");
  
  const msg = document.createElement("div");
  msg.className = `chat-msg ${type}`;
  
  msg.innerHTML = `
    <div class="avatar-wrapper">
      <div class="avatar ${type}">${name[0]}</div>
      <span class="avatar-role">${role}</span>
    </div>
    <div class="msg-bubble">
      <div class="msg-header">
        <span class="msg-name">${name}</span>
        <span class="msg-source">Simulation State</span>
      </div>
      <div class="msg-text">${text}</div>
    </div>
  `;
  
  feed.appendChild(msg);
  feed.scrollTop = feed.scrollHeight;
}

function generateInitialBoardIntro() {
  addBoardroomMessage("CEO - Growth Strategy", "CEO", "Welcome board. Our objective with " + state.startupName + " is to reach profit while capturing market share quickly. Let's make logical product decisions.", "ceo");
  addBoardroomMessage("CFO - Budget & Burn", "CFO", "Agreed. Let's maintain a healthy cash buffer. Any runway under 6 months is extreme critical territory.", "cfo");
}

function generateBoardDebate(userChoice, dilemma) {
  const feed = document.getElementById("boardroom-chat-feed");
  feed.innerHTML = ""; // Clear for next round of debates to keep it readable

  const netBurn = calculateNetBurn();
  const runwayVal = calculateRunway();

  // CEO Take
  let ceoTake = "";
  if (userChoice === "YES") {
    ceoTake = `Good initiative. Choosing to move on "${dilemma.title}" pushes the boundaries of our product offering. Expansion is necessary.`;
  } else {
    ceoTake = `I understand the prudence, but declining this leaves money on the table. We need scaling vectors to dominate.`;
  }

  // CFO Take
  let cfoTake = "";
  if (netBurn > 0) {
    if (runwayVal < BENCHMARKS.runway_critical) {
      cfoTake = `CRITICAL WARNING: The company burn rate is unsustainably high. Runway is now at ${runwayVal.toFixed(1)} months. We must cut marketing costs or raise funding immediately.`;
    } else {
      cfoTake = `Prudent adjustments. Net burn rate sits at ${formatCurrency(netBurn)}/month. Cash is currently manageable ($${Math.round(state.cash).toLocaleString()}).`;
    }
  } else {
    cfoTake = `Financial milestone reached! We are cash-flow positive with $${Math.round(-netBurn).toLocaleString()}/month in profits. Great cash control.`;
  }

  // Investor Take
  let invTake = "";
  if (state.cac > BENCHMARKS.cac_median) {
    invTake = `Note that our Customer Acquisition Cost ($${state.cac}) is higher than the SaaS average ($60). Unit economics are sub-optimal. We need organic referrals.`;
  } else {
    invTake = `CAC of $${state.cac} is highly efficient. LTV ratios look strong. If runway remains positive, I'm open to discussing a Follow-on funding round.`;
  }

  // Render comments
  setTimeout(() => addBoardroomMessage("CEO - Growth Strategy", "CEO", ceoTake, "ceo"), 100);
  setTimeout(() => addBoardroomMessage("CFO - Budget & Burn", "CFO", cfoTake, "cfo"), 400);
  setTimeout(() => addBoardroomMessage("Investor Group", "INV", invTake, "inv"), 700);

  // Bias Detector Engine (Checks patterns on the last 3 decisions)
  if (state.decisionHistory.length >= 3) {
    const last3 = state.decisionHistory.slice(-3);
    const yesCount = last3.filter(x => x === "YES").length;
    const noCount = last3.filter(x => x === "NO").length;

    let biasTake = "";
    if (yesCount === 3 && runwayVal < 8) {
      biasTake = "ALERT: Overconfidence Bias detected. You have accepted expenses 3 turns in a row despite warnings about runway dilution. Slow down capital deployment.";
    } else if (noCount === 3 && calculateMRR() < 12000) {
      biasTake = "ALERT: Loss Aversion Bias detected. You have declined consecutive opportunities to preserve short-term cash, capping organic market growth and customer volume.";
    }

    if (biasTake) {
      setTimeout(() => addBoardroomMessage("Bias Advisory Bot", "BIAS", biasTake, "bias"), 1000);
    }
  }
}

// What if debate
function generateWhatIfDebate(deltaEffect) {
  const feed = document.getElementById("boardroom-chat-feed");
  feed.innerHTML = "";

  addBoardroomMessage("Market Dispatch", "EVENT", `EVENT INSTANTIATED: ${deltaEffect.title}. ${deltaEffect.reasoning}`, "neutral");

  const ceoTake = `Crisis or Opportunity? With these adjustments, we must pivot our positioning. If CAC went up, we must expand pricing.`;
  const cfoTake = `This market shock shifts our runway immediately. Operational buffer cash is top priority. Let's reassess payroll.`;
  const invTake = `SaaS medians are breaking. We must verify if the user retention rate can survive this shock.`;

  setTimeout(() => addBoardroomMessage("CEO - Growth Strategy", "CEO", ceoTake, "ceo"), 200);
  setTimeout(() => addBoardroomMessage("CFO - Budget & Burn", "CFO", cfoTake, "cfo"), 500);
  setTimeout(() => addBoardroomMessage("Investor Group", "INV", invTake, "inv"), 800);
}

// --- SVG Charting Engine ---
function drawChart() {
  const svg = document.getElementById("trajectory-chart");
  const cashPath = document.getElementById("path-cash");
  const mrrPath = document.getElementById("path-mrr");
  const cashProjPath = document.getElementById("path-cash-proj");
  const mrrProjPath = document.getElementById("path-mrr-proj");
  const dotsContainer = document.getElementById("chart-dots");
  
  if (state.history.length === 0) return;

  const w = svg.clientWidth || 600;
  
  // 1. Calculate a 5-month projection based on current trend lines
  let tempCash = state.cash;
  let tempCustomers = state.customers;
  let projections = [];
  
  // Target total 6 month grid points
  const targetEndMonth = Math.max(6, state.month + 4);
  const monthsToProject = targetEndMonth - state.month;
  
  let currentProjCash = tempCash;
  let currentProjCustomers = tempCustomers;
  
  for (let i = 1; i <= monthsToProject; i++) {
    const pNewCustomers = Math.round(state.marketing_spend / state.cac);
    const pChurned = Math.round(currentProjCustomers * state.churn_rate);
    currentProjCustomers = Math.max(0, currentProjCustomers + pNewCustomers - pChurned);
    
    const pMRR = currentProjCustomers * state.price_per_user;
    const pExpenses = state.fixed_costs + state.marketing_spend;
    const pNetBurn = pExpenses - pMRR;
    currentProjCash -= pNetBurn;
    
    projections.push({
      month: state.month + i,
      cash: currentProjCash,
      mrr: pMRR,
      isProjected: true
    });
  }

  // 2. Concatenate history and projections
  const allPoints = [...state.history.map(d => ({ ...d, isProjected: false }))];
  if (projections.length > 0) {
    // Add bridge point (last history point) to start projections smoothly
    const lastHistory = state.history[state.history.length - 1];
    allPoints.push({ ...lastHistory, isProjected: true });
    projections.forEach(p => allPoints.push(p));
  }

  // Find boundaries
  let maxCash = Math.max(...allPoints.map(d => d.cash), 100000);
  let maxMRR = Math.max(...allPoints.map(d => d.mrr), 20000);
  let maxValue = Math.max(maxCash, maxMRR * 5); // Scale MRR to match graph bounds visually

  const totalPoints = allPoints.length;
  const xOffset = w / Math.max(5, totalPoints - 1);

  let cashCoords = [];
  let mrrCoords = [];
  let cashProjCoords = [];
  let mrrProjCoords = [];
  
  dotsContainer.innerHTML = ""; // Reset circles

  allPoints.forEach((d, idx) => {
    const x = idx * xOffset;
    const yCash = 190 - ((d.cash / maxValue) * 150);
    const yMRR = 190 - (((d.mrr * 5) / maxValue) * 150);

    if (!d.isProjected) {
      cashCoords.push(`${x},${yCash}`);
      mrrCoords.push(`${x},${yMRR}`);
      createChartDot(dotsContainer, x, yCash, "#2563EB", `Cash: ${formatCurrency(d.cash)}`, false);
      createChartDot(dotsContainer, x, yMRR, "#10B981", `MRR: ${formatCurrency(d.mrr)}`, false);
    } else {
      cashProjCoords.push(`${x},${yCash}`);
      mrrProjCoords.push(`${x},${yMRR}`);
      createChartDot(dotsContainer, x, yCash, "#3B82F6", `Proj. Cash: ${formatCurrency(d.cash)}`, true);
      createChartDot(dotsContainer, x, yMRR, "#34D399", `Proj. MRR: ${formatCurrency(d.mrr)}`, true);
    }
  });

  // Render SVG Paths
  cashPath.setAttribute("d", cashCoords.length > 0 ? `M ${cashCoords.join(" L ")}` : "");
  mrrPath.setAttribute("d", mrrCoords.length > 0 ? `M ${mrrCoords.join(" L ")}` : "");
  
  cashProjPath.setAttribute("d", cashProjCoords.length > 0 ? `M ${cashProjCoords.join(" L ")}` : "");
  mrrProjPath.setAttribute("d", mrrProjCoords.length > 0 ? `M ${mrrProjCoords.join(" L ")}` : "");

  // Update scale markers dynamically
  updateXAxisLabels();
}

function createChartDot(container, cx, cy, color, tooltipText, isProjected) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.style.cursor = "pointer";

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", isProjected ? 4 : 5.5);
  circle.setAttribute("fill", isProjected ? "#FFFFFF" : color);
  circle.setAttribute("stroke", color);
  circle.setAttribute("stroke-width", isProjected ? 1.5 : 2);
  if (isProjected) {
    circle.setAttribute("stroke-dasharray", "2 2");
  }

  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = tooltipText;

  g.appendChild(circle);
  g.appendChild(title);
  container.appendChild(g);
}

function updateXAxisLabels() {
  const labelsEl = document.getElementById("chart-x-axis-labels");
  labelsEl.innerHTML = "";
  
  const totalMonths = Math.max(6, state.history.length);
  for (let i = 1; i <= totalMonths; i++) {
    const label = document.createElement("span");
    label.textContent = `Month ${i}`;
    labelsEl.appendChild(label);
  }
}
