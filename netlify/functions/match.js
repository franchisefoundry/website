// ─────────────────────────────────────────────────────────────────────────────
// Franchise Foundry — Matching Engine
// Netlify serverless function: /.netlify/functions/match
//
// Franchisor data lives in content/franchisors/*.json
// Add a new franchisor via Decap CMS → push → it's automatically included.
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

// Budget range → max affordable investment (£)
const BUDGET_RANGES = {
  "under-50k":   50000,
  "50k-100k":    100000,
  "100k-200k":   200000,
  "200k-500k":   500000,
  "over-500k":   5000000
};

// ── Load franchisors from /content/franchisors/*.json ────────────────────────
function loadFranchisors() {
  const dir = path.join(__dirname, '../../content/franchisors');
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const raw = fs.readFileSync(path.join(dir, f), 'utf8');
        const data = JSON.parse(raw);
        data.id = f.replace('.json', '');
        return data;
      });
  } catch (e) {
    console.error('Could not load franchisors:', e.message);
    return [];
  }
}

// ── Scoring algorithm ─────────────────────────────────────────────────────────
function scoreMatch(franchisor, prospect) {
  let score = 0;

  // 1. BUDGET (35 pts) — hard filter then score
  const budgetMax = BUDGET_RANGES[prospect.budget];
  if (!budgetMax) return null;
  if (franchisor.investmentMin > budgetMax * 1.15) return null; // can't afford — hard filter
  if (franchisor.investmentMin <= budgetMax) {
    const utilisation = franchisor.investmentMin / budgetMax;
    score += utilisation >= 0.15 ? 35 : 22; // penalise massively over-qualified
  } else {
    score += 15; // slight budget stretch
  }

  // 2. LOCATION (30 pts)
  const locText = (prospect.location || '').toLowerCase();
  if (locText.trim()) {
    const locHit = (franchisor.locationsAvailable || []).some(loc => locText.includes(loc));
    score += locHit ? 30 : 5;
  } else {
    score += 15; // no preference — neutral
  }

  // 3. SECTOR (25 pts)
  const industries = Array.isArray(prospect.industry)
    ? prospect.industry
    : [prospect.industry].filter(Boolean);

  if (industries.length === 0 || industries.includes('other')) {
    score += 15; // neutral
  } else {
    const sectorHit = (franchisor.sectors || []).some(s => industries.includes(s));
    score += sectorHit ? 25 : 0;
  }

  // 4. TIMELINE (10 pts)
  const timelineScore = {
    "immediately":     (franchisor.timelineMonths || 3) <= 2 ? 10 : 4,
    "1-3-months":      (franchisor.timelineMonths || 3) <= 3 ? 10 : 6,
    "3-6-months":      (franchisor.timelineMonths || 3) <= 6 ? 10 : 7,
    "6-12-months":     10,
    "12-plus-months":  10
  };
  score += timelineScore[prospect.timeline] ?? 8;

  return Math.min(Math.round(score), 99); // 100% reserved for verified perfect match
}

// ── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type":                 "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const prospect    = JSON.parse(event.body);
    const franchisors = loadFranchisors();

    const matches = franchisors
      .map(f => {
        const score = scoreMatch(f, prospect);
        if (score === null) return null;
        return {
          id:               f.id,
          category:         f.category,
          emoji:            f.emoji,
          teaser:           f.teaser,
          investmentDisplay: f.investmentDisplay,
          locationsDisplay: f.locationsDisplay,
          highlights:       f.highlights || [],
          matchScore:       score
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.matchScore - a.matchScore);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ matches, total: matches.length })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Matching failed", detail: err.message })
    };
  }
};
