"""
cosmeticsinhot.com Skin-Care 블로그 제목 크롤러 (1~47페이지)
"""
import requests
from bs4 import BeautifulSoup
import time

BASE_URL = "https://www.cosmeticsinhot.com/ko/Skin-Care-ic3745146.html"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def get_page_url(page):
    if page == 1:
        return BASE_URL
    return f"https://www.cosmeticsinhot.com/ko/Skin-Care-ic3745146-{page}.html"

def crawl_titles(start=1, end=47):
    all_titles = []
    for page in range(start, end + 1):
        url = get_page_url(page)
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # 제목 후보 선택자 시도
            titles = []
            for sel in ["h2.title", "h3.title", ".article-title", ".post-title", "h2 a", "h3 a", ".entry-title", "article h2", "article h3"]:
                found = soup.select(sel)
                if found:
                    titles = [t.get_text(strip=True) for t in found if t.get_text(strip=True)]
                    break

            if not titles:
                # 페이지 구조 파악용 출력
                print(f"[Page {page}] 제목 못 찾음 - HTML 구조 확인 필요")
                if page == 1:
                    print(soup.prettify()[:3000])
                    break
            else:
                for t in titles:
                    all_titles.append(f"[P{page}] {t}")
                print(f"[Page {page}] {len(titles)}개 수집")

        except Exception as e:
            print(f"[Page {page}] 오류: {e}")

        time.sleep(0.5)

    return all_titles

if __name__ == "__main__":
    titles = crawl_titles(1, 47)

    out_path = r"c:\Users\rkdtl\Desktop\K-Beauty Decision Project\docs\crawled_titles.txt"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"총 {len(titles)}개 제목\n\n")
        for t in titles:
            f.write(t + "\n")

    print(f"\n완료: {len(titles)}개 저장 → {out_path}")
