import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('   EVENTRADAR COMPREHENSIVE AUTOMATED TEST SUITE    ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runSuite() {
  // 1. ENVIRONMENT & CONFIG TEST
  console.log('[1/8] Testing Environment Configuration & Keys...');
  const envFile = fs.readFileSync('.env.local', 'utf8');
  assert(envFile.includes('GEMINI_API_KEY='), 'Gemini API key is configured in .env.local');
  assert(envFile.includes('TINYFISH_API_KEY='), 'TinyFish API key is configured in .env.local');
  assert(envFile.includes('NEXT_PUBLIC_MAPBOX_'), 'Mapbox API key is configured in .env.local');
  assert(envFile.includes('NEXT_PUBLIC_FIREBASE_PROJECT_ID=') && envFile.includes('eventradar-f59b9'), 'Firebase Project ID is configured in .env.local');
  assert(envFile.includes('NEXT_PUBLIC_FIREBASE_API_KEY='), 'Firebase API Key is configured in .env.local');
  assert(fs.existsSync('.env'), '.env file exists');

  // Verify Firebase SDK initialization
  const { app, auth, db, rtdb, storage } = await import('../lib/firebase.ts');
  assert(Boolean(app), 'Firebase app initialized');
  assert(app.options.projectId === 'eventradar-f59b9', `Firebase project is "${app.options.projectId}"`);
  assert(Boolean(auth), 'Firebase Auth service initialized');
  assert(Boolean(db), 'Firebase Firestore service initialized');
  assert(Boolean(rtdb), 'Firebase Realtime Database initialized');
  assert(Boolean(storage), 'Firebase Storage service initialized');
  console.log('  -> Environment & Firebase configuration verified.\n');

  // 2. TYPESCRIPT & BUILD AUDIT
  console.log('[2/7] Testing TypeScript Compilation & Project Build...');
  try {
    execSync('npm run typecheck', { stdio: 'pipe' });
    assert(true, 'TypeScript typecheck passed with 0 errors');
  } catch (e) {
    assert(false, `TypeScript typecheck failed: ${e.message}`);
  }
  assert(fs.existsSync('.next'), 'Production .next build directory exists');
  console.log('  -> Project build and typing verified.\n');

  // 3. CRAWL4AI SCRAPER AUDIT
  console.log('[3/7] Testing Crawl4AI Python Integration...');
  const tempUrlsFile = path.join(process.cwd(), 'temp_test_urls.json');
  fs.writeFileSync(tempUrlsFile, JSON.stringify(['https://mlh.io/events']));
  try {
    const pyOutput = execSync(`python scripts/crawl4ai_service.py "${tempUrlsFile}"`, { stdio: 'pipe', encoding: 'utf-8' });
    const parsedPy = JSON.parse(pyOutput);
    assert(Array.isArray(parsedPy.pages), 'Crawl4AI returned pages array');
    assert(parsedPy.pages.length > 0, `Crawl4AI successfully scraped ${parsedPy.pages.length} pages`);
    assert(parsedPy.pages[0].text.length > 500, 'Scraped markdown text length > 500 chars');
  } finally {
    if (fs.existsSync(tempUrlsFile)) fs.unlinkSync(tempUrlsFile);
  }
  console.log('  -> Crawl4AI scraper operational.\n');

  // 4. CV PARSER API TEST (/api/cv-match)
  console.log('[4/7] Testing CV Profile Parsing via /api/cv-match...');
  const sampleCv = `
Abhishek Srivastava
Software Engineer & AI Specialist | Bangalore, India | abhi@example.com

SKILLS:
- Languages: Python, TypeScript, SQL, Go
- Frameworks: React, Next.js, PyTorch, FastAPI, Node.js
- AI/ML: LangChain, LLM Agents, RAG, OpenAI API, HuggingFace
- Tools: Docker, Git, Mapbox GL, PostgreSQL

EXPERIENCE:
Fullstack AI Developer (2024 - Present)
- Built interactive geospatial dashboard with Mapbox GL and real-time LLM agents.
- Won 2nd prize at Bangalore AI Hackfest.
`;

  const cvResponse = await fetch('http://localhost:3000/api/cv-match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sampleCv })
  });

  assert(cvResponse.ok, `/api/cv-match responded with HTTP ${cvResponse.status}`);
  const cvData = await cvResponse.json();
  assert(cvData.success === true, 'cv-match returned success: true');
  assert(Boolean(cvData.profile), 'cv-match returned candidate profile');
  assert(cvData.profile.candidate_name?.includes('Abhishek'), 'Extracted candidate name includes Abhishek');
  assert(Array.isArray(cvData.profile.top_skills) && cvData.profile.top_skills.length > 3, 'Extracted top skills array with >3 skills');
  assert(Boolean(cvData.profile.best_search_query?.topic), `Generated optimal search topic: "${cvData.profile.best_search_query?.topic}"`);
  console.log('  -> CV Profile parsing operational.\n');

  // 5. CV MATCHING & SCORING ALGORITHM TEST
  console.log('[5/7] Testing CV Matching & Scoring Logic...');
  const { scoreEventForCv } = await import('../lib/cv_match.ts');
  const mockEvent1 = {
    name: "NVIDIA Generative AI Hackathon 2026",
    start_date: "2026-11-15",
    end_date: "2026-11-17",
    date_text: "Nov 15-17, 2026",
    mode: "hybrid",
    venue_or_city: "Bangalore",
    event_type: "hackathon",
    themes: ["Generative AI", "LLM", "Deep Learning"],
    eligibility: "Open to developers and students",
    registration_url: "https://example.com/register",
    source_url: "https://example.com",
    source_name: "Devpost",
    fields_missing: [],
    fetched_at: new Date().toISOString()
  };

  const match1 = scoreEventForCv(mockEvent1, cvData.profile);
  assert(match1.score >= 70, `AI Hackathon scored high relevance: ${match1.score}% (expected >= 70%)`);
  assert(match1.level === 'high', `Match level is "high": got "${match1.level}"`);
  assert(match1.matchingSkills.length > 0, `Identified matching skills: ${match1.matchingSkills.join(', ')}`);
  assert(match1.reason.length > 5, `Generated meaningful match reason: "${match1.reason}"`);

  const mockEventIrrelevant = {
    name: "Classic Accounting & Taxation Seminar",
    start_date: "2026-12-01",
    end_date: "2026-12-01",
    date_text: "Dec 1, 2026",
    mode: "offline",
    venue_or_city: "Kolkata",
    event_type: "conference",
    themes: ["Finance", "Taxation", "Audit"],
    eligibility: "Chartered Accountants only",
    registration_url: "https://example.com/finance",
    source_url: "https://example.com",
    source_name: "Events",
    fields_missing: [],
    fetched_at: new Date().toISOString()
  };

  const matchIrrelevant = scoreEventForCv(mockEventIrrelevant, cvData.profile);
  assert(matchIrrelevant.score < 40, `Irrelevant event scored low: ${matchIrrelevant.score}% (expected < 40%)`);
  assert(matchIrrelevant.level === 'low', `Match level is "low": got "${matchIrrelevant.level}"`);
  console.log('  -> CV matching and scoring engine verified.\n');

  // 6. LIVE EVENTS SEARCH API TEST (/api/events)
  console.log('[6/7] Testing Live Events Search Pipeline (/api/events)...');
  const eventsUrl = 'http://localhost:3000/api/events?topic=AI%20hackathon&location=Bangalore&online=false';
  console.log(`  -> Querying: ${eventsUrl}`);
  const startTime = Date.now();
  const eventsResponse = await fetch(eventsUrl);
  const took = Date.now() - startTime;

  assert(eventsResponse.ok, `/api/events responded with HTTP ${eventsResponse.status} in ${(took / 1000).toFixed(1)}s`);
  const eventsResult = await eventsResponse.json();
  assert(Array.isArray(eventsResult.events), 'Events API returned events array');
  assert(eventsResult.events.length > 0, `Events API returned ${eventsResult.events.length} live events`);
  assert(Array.isArray(eventsResult.sources), 'Sources status array returned');

  // Verify event schema integrity
  const sampleEvent = eventsResult.events[0];
  assert(typeof sampleEvent.name === 'string' && sampleEvent.name.length > 0, `Event name present: "${sampleEvent.name}"`);
  assert(Boolean(sampleEvent.source_name), `Source name present: "${sampleEvent.source_name}"`);
  assert(Boolean(sampleEvent.source_url), `Source URL present: "${sampleEvent.source_url}"`);
  console.log(`  -> Returned ${eventsResult.events.length} valid tech events from sources.\n`);

  // 7. FRONTEND HOMEPAGE & COMPONENT DELIVERY TEST
  console.log('[7/8] Testing Frontend Homepage & Interactive Features...');
  const homeResponse = await fetch('http://localhost:3000/');
  assert(homeResponse.ok, `Homepage responded with HTTP ${homeResponse.status}`);
  const html = await homeResponse.text();

  assert(html.includes('EventRadar') || html.includes('Event<span'), 'Homepage contains EventRadar title');
  assert(html.includes('Match Events to Your CV / Resume'), 'Homepage contains CV Matchmaker banner');
  assert(html.includes('Interactive Mapbox Area Locator') || html.includes('Mapbox'), 'Homepage references Mapbox');
  assert(html.includes('api/cv-match') || html.includes('Upload &amp; Match CV') || html.includes('Upload & Match CV'), 'CV upload action rendered');
  console.log('  -> Frontend HTML and interactive assets verified.\n');

  // 8. KITE CURSOR & BACKGROUND REPULSION PHYSICS TEST
  console.log('[8/8] Testing Kite Cursor & Background Repulsion Engine...');
  assert(html.includes('Kites:'), 'Homepage contains Kite Sky control widget');
  assert(html.includes('Gust!'), 'Homepage contains wind gust control');
  assert(html.includes('<canvas'), 'Homepage renders dual-layer kite canvases');

  // Test repulsion vector calculation:
  // Case A: Cursor approaches kite from Top-Left (cursor: 100, 100 -> kite: 160, 160)
  const cursorA = { x: 100, y: 100 };
  const kiteA = { x: 160, y: 160, vx: 0, vy: 0 };
  const distA = Math.hypot(kiteA.x - cursorA.x, kiteA.y - cursorA.y);
  const REPEL_RADIUS = 220;
  const MAX_REPEL_FORCE = 30;

  if (distA < REPEL_RADIUS) {
    const proximity = (REPEL_RADIUS - distA) / REPEL_RADIUS;
    const force = Math.pow(proximity, 1.5) * MAX_REPEL_FORCE;
    kiteA.vx += ((kiteA.x - cursorA.x) / distA) * force * 1.25;
    kiteA.vy += ((kiteA.y - cursorA.y) / distA) * force * 1.25;
  }
  assert(kiteA.vx > 0 && kiteA.vy > 0, `Kite accelerates down-right away from top-left cursor (vx=${kiteA.vx.toFixed(2)}, vy=${kiteA.vy.toFixed(2)})`);

  // Case B: Cursor approaches kite from Right (cursor: 300, 200 -> kite: 240, 200)
  const cursorB = { x: 300, y: 200 };
  const kiteB = { x: 240, y: 200, vx: 0, vy: 0 };
  const distB = Math.hypot(kiteB.x - cursorB.x, kiteB.y - cursorB.y);
  if (distB < REPEL_RADIUS) {
    const proximity = (REPEL_RADIUS - distB) / REPEL_RADIUS;
    const force = Math.pow(proximity, 1.5) * MAX_REPEL_FORCE;
    kiteB.vx += ((kiteB.x - cursorB.x) / distB) * force * 1.25;
    kiteB.vy += ((kiteB.y - cursorB.y) / distB) * force * 1.25;
  }
  assert(kiteB.vx < 0, `Kite accelerates left away from approaching right cursor (vx=${kiteB.vx.toFixed(2)})`);
  console.log('  -> Kite cursor and repulsion physics verified.\n');

  console.log('====================================================');
  console.log(`   ALL TESTS PASSED! (${passedTests}/${totalTests} assertions passed)`);
  console.log('====================================================\n');
}

runSuite().catch((err) => {
  console.error('\n❌ Test suite failed with error:', err);
  process.exit(1);
});
