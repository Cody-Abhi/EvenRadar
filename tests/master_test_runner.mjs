import { execSync } from "child_process";
import fs from "fs";
import path from "path";

console.log("======================================================================");
console.log("         EVENTRADAR MASTER UNIFIED API & SYSTEM TEST SUITE           ");
console.log("======================================================================\n");

let passedSuites = 0;
let totalSuites = 0;

function runStep(name, fn) {
  totalSuites++;
  console.log(`\n▶ [${totalSuites}/6] RUNNING: ${name}`);
  const start = Date.now();
  try {
    fn();
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`  ✓ SUCCESS: ${name} (completed in ${duration}s)`);
    passedSuites++;
  } catch (err) {
    console.error(`  ✗ FAILURE in ${name}:`, err.message || err);
    throw err;
  }
}

async function runAsyncStep(name, fn) {
  totalSuites++;
  console.log(`\n▶ [${totalSuites}/6] RUNNING: ${name}`);
  const start = Date.now();
  try {
    await fn();
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`  ✓ SUCCESS: ${name} (completed in ${duration}s)`);
    passedSuites++;
  } catch (err) {
    console.error(`  ✗ FAILURE in ${name}:`, err.message || err);
    throw err;
  }
}

async function main() {
  // Suite 1: TypeScript & Static Type Audit
  runStep("TypeScript Compile & Typecheck Audit", () => {
    execSync("npm run typecheck", { stdio: "inherit" });
  });

  // Suite 2: Python FastAPI Pro Test Suite (pytest)
  runStep("FastAPI Pro Test Suite (pytest with Pydantic V2 & OpenAPI 3.1)", () => {
    execSync("pytest fastapi_app/test_api.py -v", { stdio: "inherit" });
  });

  // Suite 3: API Design Principles & Edge Cases (CORS, 400, 405, 422, OPTIONS)
  await runAsyncStep("API Design Principles, CORS, & Error Boundaries", async () => {
    execSync("node tests/test_api_edge_cases_and_mocks.mjs", { stdio: "inherit" });
  });

  // Suite 4: Crawl4AI Async Web Scraper Service
  runStep("Crawl4AI Web Scraper Python Service", () => {
    const tempFile = path.join(process.cwd(), "temp_crawl_test.json");
    try {
      fs.writeFileSync(tempFile, JSON.stringify(["https://mlh.io/events"]));
      const output = execSync(`python scripts/crawl4ai_service.py "${tempFile}"`, { encoding: "utf-8" });
      const parsed = JSON.parse(output);
      if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
        throw new Error("Crawl4AI did not return scraped pages.");
      }
      console.log(`    Scraped ${parsed.pages.length} page(s), ${parsed.pages[0].text.length} characters.`);
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  });

  // Suite 5: Core End-to-End Test Suite (CV Matchmaker, Live Events Search, Frontend & Kites)
  await runAsyncStep("Live End-to-End Pipeline & Matchmaker Suite", async () => {
    execSync("node --env-file=.env.local tests/run_all_tests.mjs", { stdio: "inherit" });
  });

  // Suite 6: OpenAPI 3.1 File Integrity Check
  runStep("OpenAPI 3.1 Spec Document Integrity (JSON & YAML)", () => {
    const jsonPath = path.join(process.cwd(), "docs", "openapi.json");
    const yamlPath = path.join(process.cwd(), "docs", "openapi.yaml");
    if (!fs.existsSync(jsonPath)) throw new Error("docs/openapi.json missing");
    if (!fs.existsSync(yamlPath)) throw new Error("docs/openapi.yaml missing");

    const spec = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    if (spec.openapi !== "3.1.0") throw new Error(`Invalid OpenAPI version: ${spec.openapi}`);
    if (!spec.paths["/api/events"] || !spec.paths["/api/cv-match"]) {
      throw new Error("Missing essential paths in OpenAPI spec");
    }
    console.log("    Verified OpenAPI 3.1 JSON & YAML definitions with all required endpoints.");
  });

  console.log("\n======================================================================");
  console.log(`   MASTER TEST AUDIT COMPLETE: ALL ${passedSuites}/${totalSuites} TEST SUITES PASSED!`);
  console.log("======================================================================\n");
}

main().catch((err) => {
  console.error("\n❌ Master test runner failed with error:", err.message || err);
  process.exit(1);
});
