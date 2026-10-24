import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import os from "os";
import type { MarkdownPage } from "./tinyfish";

export interface CrawlResult {
  pages: MarkdownPage[];
  errors: { url: string; error: string }[];
}

/**
 * Scrapes web pages using Crawl4AI (Python + Playwright async scraper).
 * Converts live DOM to clean LLM-ready markdown with links and metadata.
 */
export async function crawlWithCrawl4AI(
  urls: string[],
  timeoutMs = 45_000
): Promise<CrawlResult> {
  if (!urls || urls.length === 0) return { pages: [], errors: [] };

  const tempFile = path.join(
    os.tmpdir(),
    `crawl4ai_urls_${Date.now()}_${Math.random().toString(36).slice(2)}.json`
  );

  const scriptPath = path.join(process.cwd(), "scripts", "crawl4ai_service.py");

  try {
    await fs.writeFile(tempFile, JSON.stringify(urls), "utf-8");

    const pythonProcess = spawn("python", [scriptPath, tempFile], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    pythonProcess.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const exitPromise = new Promise<{ code: number | null; signal: string | null }>(
      (resolve) => {
        pythonProcess.on("exit", (code, signal) => resolve({ code, signal }));
        pythonProcess.on("error", (err) => {
          console.warn("[Crawl4AI] Process spawn error:", err.message);
          resolve({ code: 1, signal: null });
        });
      }
    );

    // Timeout guard
    const timerPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Crawl4AI scraping timed out")), timeoutMs)
    );

    const { code } = await Promise.race([exitPromise, timerPromise]);

    if (code !== 0) {
      console.warn(`[Crawl4AI] Script exited with code ${code}. Stderr: ${stderr.slice(0, 200)}`);
      return {
        pages: [],
        errors: urls.map((u) => ({ url: u, error: `Crawl4AI error: ${stderr.slice(0, 100) || "exit " + code}` })),
      };
    }

    // Parse the output JSON from Crawl4AI
    const trimmed = stdout.trim();
    const jsonStart = trimmed.lastIndexOf('{"pages":');
    const validJsonStr = jsonStart !== -1 ? trimmed.slice(jsonStart) : trimmed;

    const data = JSON.parse(validJsonStr);
    return {
      pages: Array.isArray(data.pages) ? data.pages : [],
      errors: Array.isArray(data.errors) ? data.errors : [],
    };
  } catch (err: any) {
    console.warn("[Crawl4AI] Execution failure:", err.message || err);
    return {
      pages: [],
      errors: urls.map((u) => ({ url: u, error: err.message || "Crawl4AI failed" })),
    };
  } finally {
    try {
      await fs.unlink(tempFile);
    } catch {
      // ignore temp cleanup error
    }
  }
}
