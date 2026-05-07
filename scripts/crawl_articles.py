"""
cosmeticsinhot.com 소비자 관점 기사 전문 크롤러
- 47페이지 API로 (title, url) 수집
- consumer_titles.txt 기준 필터링
- 기사 전문 저장 → docs/articles/*.txt
"""
import re, time, requests, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from bs4 import BeautifulSoup
from pathlib import Path

BASE = "https://www.cosmeticsinhot.com"
API_URL = (
    f"{BASE}/phoenix/admin/component/dynamic/node"
    "/ftfOGNAksVKZ/9c04da99-908f-4952-83f9-6d34238a7a33/YiAfKUpLIlVO"
)
LIST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": f"{BASE}/ko/Skin-Care-ic3745146.html",
    "Content-Type": "application/x-www-form-urlencoded",
}
ART_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

ROOT_DIR = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT_DIR / "docs" / "articles"
CONSUMER_FILE = ROOT_DIR / "docs" / "consumer_titles.txt"

# 제외 키워드 (필터링 로직 동일)
EXCLUDE = [
    'manufacturer', 'manufacturing', 'oem', 'odm', 'obm', 'private label',
    'guangzhou', 'aihuo', 'gmp', 'iso', 'certif', 'dust-free', 'workshop',
    'factory', 'production', 'behind the scene', 'your brand', 'global brand',
    'leading compan', 'top manufacturer', 'choose a manufacturer',
    'make your own', 'start a', 'start my own', 'how to start',
    'customize your own', 'unlock success', 'unlocking success',
    'unlocking the power', 'unlocking the global', 'spotlight',
    'quality control in', 'gmpc', 'certifications', 'iso 22716',
    'packaging', 'market insight', 'market demand', 'global market',
    'trends in 2025', 'trends in 2026', 'mass production',
    'wholesale', 'partner', 'supply', 'formulation insight',
    'insights from', 'professional insights', 'unlocking radiant',
    'unlock radiant', 'unlock your radiance', 'from concept to market',
    'skin care line', 'beauty brand', 'the science and art',
    'the future of', 'redefines', 'premier oem', 'active cosmetics',
    'hair product line', 'beauty manufacturers', 'beauty product manufacturer',
    'best practices for skin care manufacturing', 'skin care product development',
    'what is gmpc', 'skin care manufacturing',
]
INCLUDE = [
    'how to choose', 'best ', 'how to use', 'how to apply',
    'tips for', 'what to look for', 'what makes', 'benefits of',
    'what is ', 'vs', 'difference between', 'which is',
    'how often', 'ingredients', 'how to incorporate',
    'how to identify quality', 'how to tell if', 'how to select',
    'how to pick', 'how to layer', 'how to store',
    'how to avoid', 'how to compare', 'is it safe',
    'what to consider', 'what to expect', 'what to do if',
    'understanding', 'guide to', 'can you use',
    'role of', 'science behind', 'effect', 'suit',
    'for sensitive skin', 'for dry skin', 'for oily skin',
    'for acne', 'for aging', 'for men', 'for women',
    'for different skin', 'for your skin type',
]

def is_consumer(title):
    low = title.lower()
    if any(k in low for k in EXCLUDE):
        return False
    return any(k in low for k in INCLUDE)

def slug_to_filename(slug):
    name = slug.strip('/').replace('.html', '')
    name = re.sub(r'[^\w\-]', '_', name)
    return name[:120] + '.txt'

def collect_all_links():
    """47페이지에서 (title, url) 수집"""
    results = []
    seen = set()
    for page in range(1, 48):
        try:
            resp = requests.post(
                API_URL,
                data=f"appIsDev=0&pageNum={page}&infoGroupId=1362304",
                headers=LIST_HEADERS, timeout=15
            )
            soup = BeautifulSoup(resp.text, 'html.parser')
            items = soup.select('.title')
            links = [a for a in soup.find_all('a', href=True)
                     if a['href'].endswith('.html') and '/ko/' not in a['href']]

            # title과 link를 pair로 (같은 href가 2번씩 나옴)
            seen_hrefs = set()
            for a in links:
                href = a['href']
                if href in seen_hrefs:
                    continue
                seen_hrefs.add(href)
                title = a.get_text(strip=True)
                if title and title != 'View More' and href not in seen:
                    seen.add(href)
                    results.append((title, href))

            print(f"[P{page:02d}] {len(seen_hrefs)}개 링크 수집 (누적 {len(results)})")
        except Exception as e:
            print(f"[P{page:02d}] 오류: {e}")
        time.sleep(0.3)
    return results

def fetch_article(url):
    resp = requests.get(url, headers=ART_HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'html.parser')
    body = soup.select_one('.articledetail-cont')
    if not body:
        body = soup.select_one('.contentEditRichText_editorContainer')
    if not body:
        # fallback: 가장 긴 div
        divs = soup.find_all('div')
        body = max(divs, key=lambda d: len(d.get_text(strip=True)), default=None)
    return body.get_text(separator='\n', strip=True) if body else ''

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=== Step 1: 전체 링크 수집 ===")
    all_links = collect_all_links()

    print(f"\n전체 {len(all_links)}개 링크. 필터링 중...")
    filtered = [(t, h) for t, h in all_links if is_consumer(t)]
    print(f"소비자 관점 {len(filtered)}개")

    print("\n=== Step 2: 기사 전문 수집 ===")
    success, fail = 0, 0
    for i, (title, href) in enumerate(filtered, 1):
        fname = slug_to_filename(href)
        fpath = OUT_DIR / fname

        if fpath.exists():
            print(f"[{i:03d}/{len(filtered)}] SKIP (already exists): {title[:60]}")
            success += 1
            continue

        url = BASE + href
        try:
            content = fetch_article(url)
            with fpath.open('w', encoding='utf-8') as f:
                f.write(f"TITLE: {title}\nURL: {url}\n\n{content}")
            print(f"[{i:03d}/{len(filtered)}] OK ({len(content)}chars): {title[:60]}")
            success += 1
        except Exception as e:
            print(f"[{i:03d}/{len(filtered)}] FAIL: {title[:60]} | {e}")
            fail += 1

        time.sleep(0.5)

    print(f"\n완료: 성공 {success} / 실패 {fail} → {OUT_DIR}")

if __name__ == "__main__":
    main()
