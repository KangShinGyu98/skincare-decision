"""
페이지 2 클릭 시 AJAX 요청 전수 캡처
"""
from playwright.sync_api import sync_playwright
import json

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        all_requests = []

        def on_request(request):
            all_requests.append({
                'url': request.url,
                'method': request.method,
                'post': request.post_data,
            })

        page.on("request", on_request)

        print("Loading page 1...")
        page.goto("https://www.cosmeticsinhot.com/ko/Skin-Care-ic3745146.html", wait_until="networkidle", timeout=30000)

        before_count = len(all_requests)
        print(f"Initial requests: {before_count}")

        # 페이지 2 링크 클릭
        print("Clicking page 2 link...")
        page.locator('.paging a').first.click()
        page.wait_for_timeout(4000)

        after_count = len(all_requests)
        new_requests = all_requests[before_count:]

        print(f"\nNew requests after click: {len(new_requests)}")
        for r in new_requests:
            if not any(kw in r['url'] for kw in ['google', 'analytics', 'font', 'stat', 'collect']):
                print(json.dumps(r, ensure_ascii=False, indent=2))

        browser.close()

if __name__ == "__main__":
    run()
