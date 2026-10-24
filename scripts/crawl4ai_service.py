import sys
import json
import asyncio
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

async def crawl_urls(urls):
    browser_cfg = BrowserConfig(headless=True, verbose=False)
    run_cfg = CrawlerRunConfig(
        word_count_threshold=5,
        remove_overlay_elements=True,
    )

    pages = []
    errors = []

    async with AsyncWebCrawler(config=browser_cfg) as crawler:
        # Crawl concurrently with a concurrency limit
        sem = asyncio.Semaphore(4)

        async def crawl_one(url):
            async with sem:
                try:
                    res = await crawler.arun(url=url, config=run_cfg)
                    if res.success:
                        title = None
                        if isinstance(res.metadata, dict):
                            title = res.metadata.get("title")
                        
                        all_links = []
                        if isinstance(res.links, dict):
                            for link_type in ["external", "internal"]:
                                for l in res.links.get(link_type, []):
                                    href = l.get("href") if isinstance(l, dict) else str(l)
                                    if href and href.startswith("http"):
                                        all_links.push(href) if hasattr(all_links, 'push') else all_links.append(href)

                        pages.append({
                            "url": url,
                            "title": title or "",
                            "text": res.markdown or "",
                            "links": list(dict.fromkeys(all_links))[:80]
                        })
                    else:
                        errors.append({
                            "url": url,
                            "error": res.error_message or "Crawl4AI scrape failed"
                        })
                except Exception as ex:
                    errors.append({
                        "url": url,
                        "error": str(ex)
                    })

        tasks = [crawl_one(u) for u in urls]
        await asyncio.gather(*tasks)

    return {"pages": pages, "errors": errors}

def main():
    if len(sys.argv) > 1:
        # Read from file or json string argument
        arg = sys.argv[1]
        if arg.startswith("["):
            urls = json.loads(arg)
        else:
            with open(arg, "r", encoding="utf-8") as f:
                urls = json.load(f)
    else:
        # Read from stdin
        raw = sys.stdin.read()
        urls = json.loads(raw)

    result = asyncio.run(crawl_urls(urls))
    print(json.dumps(result))

if __name__ == "__main__":
    main()
