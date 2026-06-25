"use client";

import Link from "next/link";
import { useState, type FocusEvent, type KeyboardEvent } from "react";

type NavMenuId = "decision" | "matrix" | "traceback" | "rules";

type MegaMenuLink = {
  title: string;
  description: string;
  href: string;
};

type MegaMenuColumn = {
  title: string;
  links: MegaMenuLink[];
};

type NavMenuItem = {
  id: NavMenuId;
  label: string;
  panelEyebrow: string;
  panelTitle: string;
  panelDescription: string;
  columns: MegaMenuColumn[];
};

const navItems: NavMenuItem[] = [
  {
    id: "decision",
    label: "결정 흐름",
    panelEyebrow: "Decision Journey",
    panelTitle: "지금 루틴에서 먼저 판단할 것",
    panelDescription:
      "제품을 더 사기 전에 보유 제품, 고민, 우선순위를 정리해 필요한 카테고리만 좁힙니다.",
    columns: [
      {
        title: "시작",
        links: [
          {
            title: "Priority Gate",
            description: "현재 제품을 유지할지, 중단할지, 보류할지 먼저 판단합니다.",
            href: "#priority-gate",
          },
          {
            title: "Concern Mapper",
            description: "피부 고민을 추천 카테고리 우선순위로 변환합니다.",
            href: "#concern-mapper",
          },
        ],
      },
      {
        title: "질문",
        links: [
          {
            title: "Category Decision",
            description: "카테고리별로 필요한 질문만 보여줍니다.",
            href: "#category-decision",
          },
          {
            title: "Routine Context",
            description: "보유 제품과 사용 맥락을 기준으로 후보를 줄입니다.",
            href: "#routine-context",
          },
        ],
      },
      {
        title: "결과",
        links: [
          {
            title: "Next Best Category",
            description: "지금 추가할 가치가 큰 제품군을 먼저 제안합니다.",
            href: "#next-category",
          },
          {
            title: "Decision Summary",
            description: "추천 이유와 제외 이유를 한 화면에서 확인합니다.",
            href: "#decision-summary",
          },
        ],
      },
    ],
  },
  {
    id: "matrix",
    label: "제품 매트릭스",
    panelEyebrow: "Product Matrix",
    panelTitle: "조건을 통과한 후보만 비교",
    panelDescription:
      "기본 필터, 개인화 필터, 추적 근거를 묶어 제품 후보를 비교 가능한 형태로 정리합니다.",
    columns: [
      {
        title: "필터",
        links: [
          {
            title: "Basic Filter",
            description: "가격, 제형, 카테고리 같은 기본 조건을 적용합니다.",
            href: "#basic-filter",
          },
          {
            title: "Personalized Filter",
            description: "사용자 고민과 회피 조건을 반영합니다.",
            href: "#personalized-filter",
          },
        ],
      },
      {
        title: "비교",
        links: [
          {
            title: "Product Cards",
            description: "후보 제품을 같은 기준으로 나란히 비교합니다.",
            href: "#product-cards",
          },
          {
            title: "Attribute Map",
            description: "제품 속성 JSONB를 화면 기준 필드로 연결합니다.",
            href: "#attribute-map",
          },
        ],
      },
      {
        title: "운영",
        links: [
          {
            title: "Admin Input",
            description: "관리자 등록 필드와 자동 판정 기준을 맞춥니다.",
            href: "#admin-input",
          },
          {
            title: "Data Contract",
            description: "화면 데이터와 백엔드 응답 계약을 확인합니다.",
            href: "#data-contract",
          },
        ],
      },
    ],
  },
  {
    id: "traceback",
    label: "트레이스백",
    panelEyebrow: "Reaction Traceback",
    panelTitle: "문제 제품과 후보 제품의 연결",
    panelDescription:
      "불편 반응이 있었던 제품의 성분, 제형, 사용 맥락을 후보 제품 제외 근거로 이어갑니다.",
    columns: [
      {
        title: "원인 추적",
        links: [
          {
            title: "Reaction Facts",
            description: "사용자가 기억하는 반응 정보를 구조화합니다.",
            href: "#reaction-facts",
          },
          {
            title: "Avoidance Rules",
            description: "반응 이력에서 회피 조건을 생성합니다.",
            href: "#avoidance-rules",
          },
        ],
      },
      {
        title: "근거",
        links: [
          {
            title: "Ingredient Match",
            description: "성분 단서와 제품 속성을 비교합니다.",
            href: "#ingredient-match",
          },
          {
            title: "Formula Context",
            description: "농도, 카테고리, 사용 부위를 함께 봅니다.",
            href: "#formula-context",
          },
        ],
      },
      {
        title: "판정",
        links: [
          {
            title: "Risk Note",
            description: "주의가 필요한 이유를 사용자 언어로 정리합니다.",
            href: "#risk-note",
          },
          {
            title: "Safe Alternative",
            description: "회피 조건을 통과한 대안을 확인합니다.",
            href: "#safe-alternative",
          },
        ],
      },
    ],
  },
  {
    id: "rules",
    label: "성분과 룰",
    panelEyebrow: "Rules & Ingredients",
    panelTitle: "추천보다 먼저 필요한 기준",
    panelDescription:
      "카테고리 선택 기준, 속성 스키마, 성분 룰을 제품 추천 화면의 판단 기준으로 연결합니다.",
    columns: [
      {
        title: "콘텐츠",
        links: [
          {
            title: "Matching Rules",
            description: "Priority Gate와 필터 매핑의 기본 룰을 확인합니다.",
            href: "#matching-rules",
          },
          {
            title: "Page Content",
            description: "화면별 질문, CTA, 동적 슬롯을 관리합니다.",
            href: "#page-content",
          },
        ],
      },
      {
        title: "제품",
        links: [
          {
            title: "Product Taxonomy",
            description: "MVP 6개 카테고리 정의를 기준으로 탐색합니다.",
            href: "#product-taxonomy",
          },
          {
            title: "Attribute Schema",
            description: "제품 속성 키를 카테고리별로 정리합니다.",
            href: "#attribute-schema",
          },
        ],
      },
      {
        title: "성분",
        links: [
          {
            title: "Ingredient Rules",
            description: "아티클 기반 성분 룰을 판단 기준으로 정리합니다.",
            href: "#ingredient-rules",
          },
          {
            title: "External APIs",
            description: "외부 데이터 Provider와 인터페이스 계약을 봅니다.",
            href: "#external-apis",
          },
        ],
      },
    ],
  },
];

export default function Home() {
  const [activeMenuId, setActiveMenuId] = useState<NavMenuId>(navItems[0].id);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);

  const activeMenu =
    navItems.find((navItem) => navItem.id === activeMenuId) ?? navItems[0];

  function openMegaMenu(menuId: NavMenuId) {
    setActiveMenuId(menuId);
    setIsMegaMenuOpen(true);
  }

  function handleHeaderBlur(event: FocusEvent<HTMLElement>) {
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (!event.currentTarget.contains(nextFocusedElement)) {
      setIsMegaMenuOpen(false);
    }
  }

  function handleHeaderKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      setIsMegaMenuOpen(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-page)] text-[var(--color-text-primary)]">
      <header
        className="sticky top-0 z-[var(--z-sticky)] border-b border-[var(--color-border-split)] bg-[var(--color-bg-dark)]"
        onBlur={handleHeaderBlur}
        onKeyDown={handleHeaderKeyDown}
        onMouseLeave={() => setIsMegaMenuOpen(false)}
      >
        <nav
          aria-label="Primary navigation"
          className="mx-auto flex h-[64px] max-w-[1200px] items-center px-[var(--space-6)]"
        >
          <Link
            className="flex items-center gap-[var(--space-3)] text-[var(--color-text-inverse)] outline-none focus-visible:shadow-[var(--shadow-focus)]"
            href="/"
            onFocus={() => setIsMegaMenuOpen(false)}
          >
            <span className="flex h-[32px] w-[32px] items-center justify-center rounded-[var(--radius-base)] bg-[var(--color-primary)] text-[length:var(--font-size-sm)] font-[var(--font-weight-bold)] text-[var(--color-text-inverse)] shadow-[var(--shadow-btn)]">
              SD
            </span>
            <span className="text-[length:var(--font-size-md)] font-[var(--font-weight-medium)]">
              Skincare Decision
            </span>
          </Link>

          <div className="ml-[var(--space-10)] flex h-full items-center">
            {navItems.map((navItem) => {
              const isActive =
                navItem.id === activeMenuId && isMegaMenuOpen;

              return (
                <button
                  aria-controls="landing-mega-menu"
                  aria-expanded={isActive}
                  aria-haspopup="true"
                  className={`relative flex h-full items-center px-[var(--space-4)] text-[length:var(--font-size-base)] font-[var(--font-weight-medium)] outline-none transition-colors ${
                    isActive
                      ? "text-[var(--color-text-inverse)]"
                      : "text-[color:rgba(255,255,255,0.72)] hover:text-[var(--color-text-inverse)] focus-visible:text-[var(--color-text-inverse)]"
                  }`}
                  key={navItem.id}
                  onFocus={() => openMegaMenu(navItem.id)}
                  onMouseEnter={() => openMegaMenu(navItem.id)}
                  type="button"
                >
                  <span>{navItem.label}</span>
                  <span
                    className={`absolute inset-x-[var(--space-4)] bottom-0 h-[2px] rounded-[var(--radius-pill)] bg-[var(--color-primary)] transition-opacity ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <a
            className="ml-auto inline-flex h-[var(--height-lg)] items-center justify-center rounded-[var(--radius-base)] border border-[var(--color-primary)] bg-[var(--color-primary)] px-[var(--space-5)] text-[length:var(--font-size-base)] font-[var(--font-weight-medium)] text-[var(--color-text-inverse)] shadow-[var(--shadow-btn)] outline-none transition-colors hover:border-[var(--color-primary-hover)] hover:bg-[var(--color-primary-hover)] focus-visible:shadow-[var(--shadow-focus)]"
            href="#start"
            onFocus={() => setIsMegaMenuOpen(false)}
          >
            시작하기
          </a>
        </nav>

        {isMegaMenuOpen ? (
          <div
            aria-label={`${activeMenu.label} menu`}
            className="absolute inset-x-0 top-full border-b border-[var(--color-border-light)] bg-[var(--color-bg-white)] shadow-[var(--shadow-2)]"
            id="landing-mega-menu"
          >
            <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(240px,320px)_1fr] gap-[var(--space-10)] px-[var(--space-6)] py-[var(--space-8)]">
              <div>
                <p className="mb-[var(--space-2)] text-[length:var(--font-size-xs)] font-[var(--font-weight-bold)] uppercase text-[var(--color-primary)]">
                  {activeMenu.panelEyebrow}
                </p>
                <h2 className="mb-[var(--space-3)] text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] leading-[var(--line-height-tight)] text-[var(--color-text-heading)]">
                  {activeMenu.panelTitle}
                </h2>
                <p className="mb-0 text-[length:var(--font-size-base)] leading-[var(--line-height-normal)] text-[var(--color-text-secondary)]">
                  {activeMenu.panelDescription}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-[var(--space-6)]">
                {activeMenu.columns.map((column) => (
                  <section key={column.title}>
                    <h3 className="mb-[var(--space-3)] text-[length:var(--font-size-sm)] font-[var(--font-weight-bold)] text-[var(--color-text-primary)]">
                      {column.title}
                    </h3>
                    <div className="space-y-[var(--space-2)]">
                      {column.links.map((link) => (
                        <a
                          className="block rounded-[var(--radius-md)] border border-transparent p-[var(--space-3)] outline-none transition-colors hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-light)] focus-visible:border-[var(--color-primary-border)] focus-visible:bg-[var(--color-primary-light)] focus-visible:shadow-[var(--shadow-focus)]"
                          href={link.href}
                          key={link.title}
                        >
                          <span className="block text-[length:var(--font-size-base)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)]">
                            {link.title}
                          </span>
                          <span className="mt-[var(--space-1)] block text-[length:var(--font-size-sm)] leading-[var(--line-height-normal)] text-[var(--color-text-secondary)]">
                            {link.description}
                          </span>
                        </a>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main className="min-h-[560px]" id="start" />
    </div>
  );
}
