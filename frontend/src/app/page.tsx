import SiteHeader from '@/components/SiteHeader';
import { LandingActionCard } from '@/components/LandingActionCard';
import { RotatingCategoryText } from '@/components/RotatingCategoryText';
import '../style/landingPageAnimation.css';
import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <SiteHeader></SiteHeader>
      <main className="h-screen overflow-y-scroll snap-y snap-proximity scroll-smooth">
        {/*랜딩페이지1*/}
        <section className="snap-start flex min-h-screen w-full items-center justify-center bg-[var(--color-bg-page)] p-10">
          <div className="flex h-[70vh] w-full max-w-[1200px] translate-y-8 overflow-hidden rounded-3xl bg-[var(--color-bg-component)] shadow-lg">
            <article className="grid flex-[5] grid-cols-2 grid-rows-[6.5fr_3.5fr] gap-4 p-20">
              <div className="col-span-2 flex flex-col gap-2">
                <span className="text-xl font-medium text-[var(--color-text-secondary)]">
                  더 적은, 더 좋은
                </span>
                <h2>제품 추천보다 루틴 점검이 먼저입니다</h2>
                <ul className="space-y-3 text-base leading-4 text-[var(--color-text-secondary)]">
                  <li>화장품 보다 브러시/루틴이 문제일 수 있어요 </li>
                  <li>스킨? 로션? 앰플? 세럼? 지금 뭐 사야할지 모르겠나요?</li>
                  <li>선크림 하나 사는데, SPF, PA, 백탁, 눈시림까지 봐야 하나요?</li>
                </ul>
              </div>
              <LandingActionCard href="/priority-gate">
                <h4 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  루틴 점검하기
                </h4>
                <p className="mt-2 text-xs leading-6 text-[var(--color-text-secondary)]">
                  최근 자극, 선크림, 클렌징, 보습 상태를 먼저 확인합니다.
                </p>
                <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-medium text-[var(--color-text-primary)]">
                  보러가기
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </LandingActionCard>
              <LandingActionCard href="/priority-gate">
                <h4 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  <RotatingCategoryText /> 체크리스트
                </h4>
                <p className="mt-2 text-xs leading-6 text-[var(--color-text-secondary)]">
                  제품 선정 기준을 안내해 드립니다.
                </p>
                <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-medium text-[var(--color-text-primary)]">
                  보러가기
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </LandingActionCard>
              <div className="bg-red-300"></div>
            </article>
            <aside className="flex-[5] py-8 pl-8 ">
              <div className="h-full w-full rounded-l-3xl bg-[var(--color-bg-page)] ">
                이미지 영역
              </div>
            </aside>
          </div>
        </section>
        {/*랜딩페이지2*/}
        <section className="snap-start flex min-h-screen w-full items-center justify-center bg-[var(--color-bg-page)] p-10">
          <div className="flex h-[70vh] w-full max-w-[1200px] translate-y-8 overflow-hidden rounded-3xl bg-[var(--color-bg-component)] shadow-lg">
            <aside className="flex-[5] py-8 pr-8 ">
              <div className="h-full w-full rounded-r-3xl bg-[var(--color-bg-page)] ">이미지</div>
            </aside>
            <article className="flex-[5] pl-8 py-8 ">
              <div className="h-full w-full flex flex-col justify-center pr-28 gap-2">
                <span className="text-xl font-medium leading-7 text-[var(--color-text-secondary)]">
                  루틴 점검하기
                </span>
                <h2 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-[var(--color-text-primary)] md:text-5xl">
                  지금 그 제품을 꼭 사야 할까요?
                </h2>
                <ul className=" text-lg leading-7 text-[var(--color-text-secondary)]">
                  <li>
                    피부 상태, 선크림 루틴, 클렌징, 나이트 루틴, 침구와 도구 위생을 함께 점검합니다.
                  </li>
                  <li>구매가 필요한지, 루틴 정리가 먼저인지 알려줍니다.</li>
                </ul>
                <Link
                  href="/priority-gate"
                  className="group mt-10 inline-flex w-fit items-center rounded-full border border-[var(--color-border-card)] bg-[var(--color-bg-card)] px-7 py-4 text-base font-semibold text-[var(--color-text-primary)] shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-border-card-hover)] hover:bg-[var(--color-bg-card-hover)] hover:shadow-[var(--shadow-card-hover)]"
                >
                  루틴 점검 시작하기
                  <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </article>
          </div>
        </section>
        {/*랜딩페이지3*/}
        <section className="snap-start flex min-h-screen w-full items-center justify-center bg-[var(--color-bg-page)] p-10">
          <div className="flex h-[70vh] w-full max-w-[1200px] translate-y-8 overflow-hidden rounded-3xl bg-[var(--color-bg-component)] shadow-lg">
            <article className="flex-[5] pr-8 py-8 ">
              <div className="h-full w-full flex flex-col justify-center pl-28 gap-2">
                <span className="text-xl font-medium leading-7 text-[var(--color-text-secondary)]">
                  스킨케어 체크리스트
                </span>
                <h2 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-[var(--color-text-primary)] md:text-5xl">
                  제품 선택에 필요한 기준을 한 번에 확인하세요
                </h2>
                <ul className=" text-lg leading-7 text-[var(--color-text-secondary)]">
                  <li>
                    성분, 제형, 사용감, 향, 끈적임, 휴대성까지 제품군별로 꼭 확인해야 할 기준을
                    체크리스트로 정리합니다.
                  </li>
                  <li>선크림, 세럼, 립케어처럼 카테고리마다 다른 질문만 골라 확인합니다.</li>
                </ul>
                <Link
                  href="/category-decision"
                  className="group mt-10 inline-flex w-fit items-center rounded-full border border-[var(--color-border-card)] bg-[var(--color-bg-card)] px-7 py-4 text-base font-semibold text-[var(--color-text-primary)] shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-border-card-hover)] hover:bg-[var(--color-bg-card-hover)] hover:shadow-[var(--shadow-card-hover)]"
                >
                  체크리스트 점검하기
                  <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </article>

            <aside className="flex-[5] py-8 pl-8 ">
              <div className="h-full w-full rounded-l-3xl bg-[var(--color-bg-page)] ">
                이미지 영역
              </div>
            </aside>
          </div>
        </section>
      </main>
      <footer></footer>
    </div>
  );
}
