"""
crawl/articles/*.txt → crawl/notes/*.md
각 기사를 skincare_product_selection_rule.md 형식으로 정리
"""
import os, sys, io, time, glob, anthropic

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = r"c:\Users\rkdtl\Desktop\K-Beauty Decision Project"
IN_DIR = os.path.join(BASE, "crawl", "articles")
OUT_DIR = os.path.join(BASE, "crawl", "notes")
os.makedirs(OUT_DIR, exist_ok=True)

CLIENT = anthropic.Anthropic()

SYSTEM_PROMPT = """당신은 스킨케어 전문가입니다. 영문 스킨케어 기사를 읽고, 아래 형식에 맞게 한국어로 핵심 정보를 정리합니다.

## 출력 형식 규칙
- 제목: # [제품/주제명]
- 소제목: ### [소주제]
- 내용: 키워드 - 내용1, 내용2, 내용3
- 한 줄에 하나의 사실/규칙만
- 불필요한 마케팅 문구, 브랜드명(Guangzhou Aihuo 등) 제외
- OEM/제조사 관련 내용 제외, 소비자 관점 정보만 추출
- 성분명은 원문(영문) 유지, 설명은 한국어

## 예시 출력
# 핸드크림

### 선택 기준

핸드크림 핵심 기능 - 즉각적 보습, 피부 장벽 복구, 장기 보습 유지
장벽 복구 성분 - 세라마이드, 콜레스테롤, 지방산, 시어버터, 스쿠알란
보습 성분(humectant) - 글리세린, 히알루론산, 우레아, 프로필렌글라이콜
질감 선택 - 논그리지 텍스처, 빠른 흡수, 잔여감 없는 제형

### 피부 타입별

건성 손 - 나이트 크림, 두꺼운 제형, 오클루시브 성분 포함 제품 선택
민감성 피부 - 무향 또는 저자극 제형, 잦은 세정 대응 포뮬러 선택
노화 피부 - 레티놀, 펩타이드 성분 포함 제품 선택

### 사용법

기본 루틴 - 세정 직후 수분 남은 상태에서 적용, 흡수 극대화
주간용 - 가벼운 제형, 끈적임 없는 제품 선택
야간용 - 두꺼운 제형 허용, 집중 케어 가능"""

def organize(article_text: str) -> str:
    resp = CLIENT.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {
                "role": "user",
                "content": f"다음 기사를 정리해주세요:\n\n{article_text[:6000]}"
            }
        ],
    )
    return resp.content[0].text

def main():
    files = sorted(glob.glob(os.path.join(IN_DIR, "*.txt")))
    total = len(files)
    print(f"총 {total}개 파일 처리 시작")

    ok, skip, fail = 0, 0, 0
    for i, fpath in enumerate(files, 1):
        fname = os.path.basename(fpath).replace(".txt", ".md")
        out_path = os.path.join(OUT_DIR, fname)

        if os.path.exists(out_path):
            skip += 1
            print(f"[{i:03d}/{total}] SKIP: {fname[:60]}")
            continue

        try:
            with open(fpath, encoding="utf-8") as f:
                content = f.read()

            result = organize(content)

            with open(out_path, "w", encoding="utf-8") as f:
                f.write(result)

            ok += 1
            preview = result.split('\n')[0][:60]
            print(f"[{i:03d}/{total}] OK: {preview}")

        except Exception as e:
            fail += 1
            print(f"[{i:03d}/{total}] FAIL: {fname[:50]} | {e}")

        time.sleep(0.2)

    print(f"\n완료: OK={ok}, SKIP={skip}, FAIL={fail} → {OUT_DIR}")

if __name__ == "__main__":
    main()
