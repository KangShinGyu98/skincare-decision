"""
cosmeticsinhot.com Skin-Care 블로그 제목 크롤러 (1~47페이지)
AJAX API 직접 호출 방식
"""
import requests
from bs4 import BeautifulSoup
import time

API_URL = (
    "https://www.cosmeticsinhot.com/phoenix/admin/component/dynamic/node"
    "/ftfOGNAksVKZ/9c04da99-908f-4952-83f9-6d34238a7a33/YiAfKUpLIlVO"
)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://www.cosmeticsinhot.com/ko/Skin-Care-ic3745146.html",
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Requested-With": "XMLHttpRequest",
}

def get_titles_from_page(page_num):
    data = f"appIsDev=0&pageNum={page_num}&infoGroupId=1362304"
    resp = requests.post(API_URL, data=data, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    titles = [el.get_text(strip=True) for el in soup.select(".title") if el.get_text(strip=True)]
    return titles

def crawl_all(start=1, end=47):
    all_titles = []
    for page in range(start, end + 1):
        try:
            titles = get_titles_from_page(page)
            for t in titles:
                all_titles.append(t)
            print(f"[P{page:02d}] {len(titles)}개")
        except Exception as e:
            print(f"[P{page:02d}] 오류: {e}")
        time.sleep(0.3)
    return all_titles

if __name__ == "__main__":
    titles = crawl_all(1, 47)

    out_path = r"c:\Users\rkdtl\Desktop\K-Beauty Decision Project\docs\crawled_titles.txt"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"총 {len(titles)}개 제목\n\n")
        for i, t in enumerate(titles, 1):
            f.write(f"{i:03d}. {t}\n")

    print(f"\n완료: 총 {len(titles)}개 → {out_path}")
