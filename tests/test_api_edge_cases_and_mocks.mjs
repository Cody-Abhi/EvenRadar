import assert from "assert";

console.log("====================================================");
console.log("   EVENTRADAR API EDGE CASE & MOCK TEST SUITE       ");
console.log("====================================================\n");

let passed = 0;
let total = 0;

function check(condition, desc) {
  total++;
  if (condition) {
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
}

async function runEdgeCaseTests() {
  const BASE_URL = "http://localhost:3000";

  // 1. HTTP 400: Missing query parameter 'topic' on /api/events
  console.log("[1/6] Testing /api/events Input Validation (400 Bad Request)...");
  const res1 = await fetch(`${BASE_URL}/api/events`);
  check(res1.status === 400, "GET /api/events with missing topic returned HTTP 400");
  const json1 = await res1.json();
  check(Boolean(json1.error), "Error message returned");
  check(json1.code === "INVALID_ARGUMENT", `Expected error code 'INVALID_ARGUMENT', got '${json1.code}'`);
  check(Boolean(json1.details), "Error details field returned");
  check(res1.headers.get("access-control-allow-origin") === "*", "CORS header present on 400 error");

  // 2. HTTP 400: Whitespace-only topic on /api/events
  const res2 = await fetch(`${BASE_URL}/api/events?topic=%20%20%20`);
  check(res2.status === 400, "GET /api/events with whitespace-only topic returned HTTP 400");

  // 3. HTTP 405: Method Not Allowed on /api/events
  console.log("\n[2/6] Testing Method Constraints (405 Method Not Allowed)...");
  const res3 = await fetch(`${BASE_URL}/api/events`, { method: "POST" });
  check(res3.status === 405, "POST /api/events returned HTTP 405 Method Not Allowed");

  // 4. CORS Preflight (OPTIONS)
  console.log("\n[3/6] Testing CORS Preflight (OPTIONS /api/events & /api/cv-match)...");
  const resOptEvents = await fetch(`${BASE_URL}/api/events`, { method: "OPTIONS" });
  check(resOptEvents.status === 204, "OPTIONS /api/events returned HTTP 204 No Content");
  check(resOptEvents.headers.get("access-control-allow-origin") === "*", "CORS Allow-Origin is *");
  check(resOptEvents.headers.get("access-control-allow-methods")?.includes("GET"), "CORS Allow-Methods includes GET");

  const resOptCv = await fetch(`${BASE_URL}/api/cv-match`, { method: "OPTIONS" });
  check(resOptCv.status === 204, "OPTIONS /api/cv-match returned HTTP 204 No Content");
  check(resOptCv.headers.get("access-control-allow-origin") === "*", "CORS Allow-Origin is *");
  check(resOptCv.headers.get("access-control-allow-methods")?.includes("POST"), "CORS Allow-Methods includes POST");

  // 5. GET /api/cv-match Documentation Endpoint
  console.log("\n[4/6] Testing GET /api/cv-match Spec Endpoint...");
  const resCvGet = await fetch(`${BASE_URL}/api/cv-match`);
  check(resCvGet.status === 200, "GET /api/cv-match returned HTTP 200 with usage instructions");
  const jsonCvGet = await resCvGet.json();
  check(jsonCvGet.name === "EventRadar CV Matchmaker API", "API name returned");
  check(jsonCvGet.method === "POST", "Informs caller to use POST");
  check(Array.isArray(jsonCvGet.supported_content_types), "Supported content-types listed");

  // 6. POST /api/cv-match Validation (400 Bad Request)
  console.log("\n[5/6] Testing /api/cv-match Validation & Malformed Payloads...");
  const resCvEmpty = await fetch(`${BASE_URL}/api/cv-match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  check(resCvEmpty.status === 400, "POST /api/cv-match with empty JSON returned HTTP 400");
  const jsonCvEmpty = await resCvEmpty.json();
  check(jsonCvEmpty.code === "MISSING_TEXT_FIELD", "Error code is 'MISSING_TEXT_FIELD'");

  const resCvWhitespace = await fetch(`${BASE_URL}/api/cv-match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "    \n   " }),
  });
  check(resCvWhitespace.status === 400, "POST /api/cv-match with whitespace text returned HTTP 400");

  // 7. OpenAPI 3.1 Specification Route (/api/openapi.json)
  console.log("\n[6/6] Testing OpenAPI 3.1 Specification Contract (/api/openapi.json)...");
  const resSpec = await fetch(`${BASE_URL}/api/openapi.json`);
  check(resSpec.status === 200, "/api/openapi.json returned HTTP 200");
  const spec = await resSpec.json();
  check(spec.openapi === "3.1.0", "OpenAPI version is 3.1.0");
  check(spec.info.title === "EventRadar API", `OpenAPI title is '${spec.info.title}'`);
  check(Boolean(spec.paths["/api/events"]), "Path /api/events defined in OpenAPI spec");
  check(Boolean(spec.paths["/api/cv-match"]), "Path /api/cv-match defined in OpenAPI spec");
  check(Boolean(spec.components.schemas.EventItem), "EventItem schema defined in OpenAPI components");
  check(Boolean(spec.components.schemas.CvProfile), "CvProfile schema defined in OpenAPI components");
  check(Boolean(spec.components.schemas.EventsApiResponse), "EventsApiResponse schema defined in OpenAPI components");

  console.log("\n====================================================");
  console.log(`   ALL EDGE CASE & MOCK TESTS PASSED! (${passed}/${total} assertions passed)`);
  console.log("====================================================\n");
}

runEdgeCaseTests().catch((err) => {
  console.error("\n❌ Edge Case Test Suite failed:", err);
  process.exit(1);
});
