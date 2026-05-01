"""
페이지 2 클릭 시 발생하는 AJAX 요청 캡처
"""
from playwright.sync_api import sync_playwright
import json

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        requests_log = []

        def on_request(request):
            url = request.url
            if any(kw in url for kw in ['info', 'article', 'page', 'list', 'block', 'api']):
                requests_log.append({
                    'url': url,
                    'method': request.method,
                    'post': request.post_data,
                })

        page.on("request", on_request)

        print("Loading page 1...")
        page.goto("https://www.cosmeticsinhot.com/ko/Skin-Care-ic3745146.html", wait_until="networkidle", timeout=30000)

        print("Clicking page 2...")
        page.evaluate("tempftfOGNAksVKZ('ftfOGNAksVKZ','2', '')")
        page.wait_for_timeout(3000)

        browser.close()

        print(f"\nCaptured {len(requests_log)} relevant requests:")
        for r in requests_log:
            print(json.dumps(r, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    run()
