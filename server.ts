import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("waqibyx.db");

// Initialize database with security logs
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    message_count INTEGER DEFAULT 0,
    unlimited_until INTEGER DEFAULT 0,
    subscription_tier TEXT DEFAULT 'free',
    persona TEXT DEFAULT 'helpful',
    preferences TEXT DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS user_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    content TEXT,
    timestamp INTEGER
  );
  CREATE TABLE IF NOT EXISTS user_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    filename TEXT,
    content TEXT,
    timestamp INTEGER
  );
  CREATE TABLE IF NOT EXISTS admin_codes (
    code TEXT PRIMARY KEY,
    expires_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT,
    amount REAL,
    status TEXT DEFAULT 'pending',
    created_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS security_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT,
    ip TEXT,
    timestamp INTEGER
  );
`);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "azan122123";

// Simple Rate Limiter
const loginAttempts = new Map<string, { count: number, lastAttempt: number }>();

function checkRateLimit(ip: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  
  if (now - attempt.lastAttempt < 60000 && attempt.count >= 5) {
    return false; // Blocked for 1 minute after 5 attempts
  }
  
  if (now - attempt.lastAttempt > 60000) {
    attempt.count = 1;
  } else {
    attempt.count++;
  }
  attempt.lastAttempt = now;
  loginAttempts.set(ip, attempt);
  return true;
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Middleware to log security events
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/admin') || req.path === '/api/withdraw') {
      const ip = req.ip || 'unknown';
      db.prepare("INSERT INTO security_logs (event, ip, timestamp) VALUES (?, ?, ?)")
        .run(`Access attempt: ${req.path}`, ip, Date.now());
    }
    next();
  });

  // API Routes
  
  // Get or create user
  app.post("/api/user", (req, res) => {
    const { userId } = req.body;
    let user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (!user) {
      db.prepare("INSERT INTO users (id) VALUES (?)").run(userId);
      user = { id: userId, message_count: 0, unlimited_until: 0, subscription_tier: 'free', persona: 'helpful', preferences: '{}' };
    }
    
    // Fetch memory and files
    const memory = db.prepare("SELECT * FROM user_memory WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20").all(userId);
    const files = db.prepare("SELECT * FROM user_files WHERE user_id = ? ORDER BY timestamp DESC").all(userId);
    
    res.json({ ...user, memory, files });
  });

  // Update user persona and preferences
  app.post("/api/user/settings", (req, res) => {
    const { userId, persona, preferences, subscription_tier } = req.body;
    if (persona) db.prepare("UPDATE users SET persona = ? WHERE id = ?").run(persona, userId);
    if (preferences) db.prepare("UPDATE users SET preferences = ? WHERE id = ?").run(JSON.stringify(preferences), userId);
    if (subscription_tier) db.prepare("UPDATE users SET subscription_tier = ? WHERE id = ?").run(subscription_tier, userId);
    
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    res.json(user);
  });

  // Add memory
  app.post("/api/user/memory", (req, res) => {
    const { userId, content } = req.body;
    db.prepare("INSERT INTO user_memory (user_id, content, timestamp) VALUES (?, ?, ?)")
      .run(userId, content, Date.now());
    res.json({ success: true });
  });

  // Save file
  app.post("/api/user/files", (req, res) => {
    const { userId, filename, content } = req.body;
    db.prepare("INSERT INTO user_files (user_id, filename, content, timestamp) VALUES (?, ?, ?, ?)")
      .run(userId, filename, content, Date.now());
    res.json({ success: true });
  });

  // Increment message count
  app.post("/api/user/increment", (req, res) => {
    const { userId } = req.body;
    db.prepare("UPDATE users SET message_count = message_count + 1 WHERE id = ?").run(userId);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    res.json(user);
  });

  // Admin Stats
  app.post("/api/admin/stats", (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });

    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const tiers = db.prepare("SELECT subscription_tier, COUNT(*) as count FROM users GROUP BY subscription_tier").all();
    const totalMessages = db.prepare("SELECT SUM(message_count) as count FROM users").get() as any;
    const recentLogs = db.prepare("SELECT * FROM security_logs ORDER BY timestamp DESC LIMIT 10").all();
    const pendingWithdrawals = db.prepare("SELECT * FROM withdrawals WHERE status = 'pending'").all();

    // Mock Business Analytics Data
    const userGrowth = [
      { date: 'Mar 01', count: 120 },
      { date: 'Mar 02', count: 150 },
      { date: 'Mar 03', count: 180 },
      { date: 'Mar 04', count: 240 },
      { date: 'Mar 05', count: 310 },
      { date: 'Mar 06', count: 420 },
      { date: 'Mar 07', count: totalUsers.count },
    ];

    const revenueExpenses = [
      { month: 'Jan', revenue: 45000, expenses: 12000 },
      { month: 'Feb', revenue: 52000, expenses: 15000 },
      { month: 'Mar', revenue: 68000, expenses: 22000 },
    ];

    const tokenUsage = [
      { feature: 'Text Chat', tokens: 450000 },
      { feature: 'Image Gen', tokens: 820000 },
      { feature: 'Voice Dub', tokens: 120000 },
      { feature: 'Video Gen', tokens: 350000 },
    ];

    const peakActivity = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      users: Math.floor(Math.random() * 100) + (i > 18 || i < 2 ? 50 : 10)
    }));

    res.json({
      totalUsers: totalUsers.count,
      tiers,
      totalMessages: totalMessages.count || 0,
      recentLogs,
      pendingWithdrawals,
      userGrowth,
      revenueExpenses,
      tokenUsage,
      peakActivity
    });
  });

  // Verify Admin Password & Generate Code
  app.post("/api/admin/generate-code", (req, res) => {
    const { password } = req.body;
    const ip = req.ip || 'unknown';

    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: "Too many attempts. Try again later." });
    }

    if (password === ADMIN_PASSWORD) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      db.prepare("INSERT INTO admin_codes (code, expires_at) VALUES (?, ?)").run(code, expiresAt);
      res.json({ code, expiresAt });
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  });

  // Redeem Code
  app.post("/api/user/redeem", (req, res) => {
    const { userId, code } = req.body;
    const adminCode = db.prepare("SELECT * FROM admin_codes WHERE code = ?").get(code) as any;
    
    if (adminCode && adminCode.expires_at > Date.now()) {
      const unlimitedUntil = Date.now() + 24 * 60 * 60 * 1000;
      db.prepare("UPDATE users SET unlimited_until = ? WHERE id = ?").run(unlimitedUntil, userId);
      res.json({ success: true, unlimitedUntil });
    } else {
      res.status(400).json({ error: "Invalid or expired code" });
    }
  });

  // Withdrawal Request
  app.post("/api/withdraw", (req, res) => {
    const { password, phoneNumber, amount } = req.body;
    const ip = req.ip || 'unknown';

    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: "Too many attempts." });
    }

    if (password === ADMIN_PASSWORD) {
      db.prepare("INSERT INTO withdrawals (phone_number, amount, created_at) VALUES (?, ?, ?)")
        .run(phoneNumber, amount, Date.now());
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
