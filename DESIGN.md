# Design System — 경기테크노파크 인건비 및 참여율 관리 SaaS

## Product Context
- **What this is:** 정부/지자체 사업 수탁 시 발생하는 인건비 관리 및 참여율 계산 시스템
- **Who it's for:** 전직원이 사용 (추후 회계/인건비 관리자 전용 가능)
- **Space/industry:** 공공기관/정부 산하 기관 (테크노park)
- **Project type:** 데이터 대시보드 + 관리 시스템

## Aesthetic Direction
- **Direction:** Organic/Natural — 따뜻한 친근한 톤, 친환경/지속가능성 느낌
- **Decoration level:** Intentional — 자연-inspired 색상에 미세한 텍스처
- **Mood:** 신뢰감 있으면서도 접근하기 쉬운, 데이터 중심이지만 차갑지 않은
- **Reference sites:** 현대적 공공데이터 대시보드,Eco Dashboard

## Typography
- **Display/Hero:** Pretendard (또는 Noto Sans KR) — 가독성 좋은 한국어 디스플레이
- **Body:** Pretendard — 일관된 한국어 타이포그라피
- **UI/Labels:** Pretendard — 본문과 동일
- **Data/Tables:** JetBrains Mono — 숫자 정렬용 모노스페이스
- **Code:** JetBrains Mono
- **Loading:** 시스템 폰트 폴백

## Color (따뜻한 친근한 팔레트)
- **Approach:** Balanced with warm accents
- **Primary:** `#2D5A27` (Forest Green) — 신뢰, 성장
- **Primary Light:** `#4A7C43` (Sage Green)
- **Primary Dark:** `#1E3D1A` (Deep Forest)
- **Secondary:** `#E8A838` (Warm Amber) — 에너지, 경고
- **Accent:** `#D35E3B` (Terracotta) — 중요 알림, 강조
- **Background:** `#FAFAF7` (Warm White)
- **Surface:** `#FFFFFF` (Pure White)
- **Surface Alt:** `#F5F3ED` (Cream)
- **Text Primary:** `#2C2C2C` (Warm Black)
- **Text Secondary:** `#6B6B6B` (Warm Gray)
- **Text Muted:** `#9B9B9B` (Light Gray)
- **Border:** `#E5E2D9` (Warm Border)
- **Success:** `#2D5A27` (Forest Green)
- **Warning:** `#E8A838` (Warm Amber)
- **Error:** `#D35E3B` (Terracotta)
- **Info:** `#4A7C9B` (Muted Teal)
- **Dark mode:** Surface `#1A1A1A`, Background `#121212`, Text `#E5E5E5`

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — 공공기관 사용자를 위한 충분한 여백
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)

## Layout
- **Approach:** Grid-disciplined with dashboard focus
- **Grid:** 12 columns, 24px gutter
- **Max content width:** 1440px
- **Border radius:** sm(4px) md(8px) lg(12px) xl(16px) full(9999px)
- **Card shadows:** subtle warm shadows `0 1px 3px rgba(45, 90, 39, 0.08)`

## Motion
- **Approach:** Minimal-functional — 이해를 돕는 전환만, 과하지 않음
- **Easing:** ease-out (enter), ease-in (exit)
- **Duration:** micro(100ms) short(200ms) medium(300ms)

## Component Patterns
- **Cards:** White surface, subtle border, warm shadow
- **Tables:** Alternating row colors (white/cream), clear header
- **Buttons:** Rounded (8px), clear hierarchy (primary/secondary/ghost)
- **Forms:** Clean labels, inline validation
- **Charts:** Warm color palette, rounded corners on elements

## Dashboard Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ Header: 로고 | 시스템명 | 검색 | 사용자 메뉴                      │
├─────────┬───────────────────────────────────────────────────────┤
│         │                                                        │
│ Sidebar │  Main Content Area                                    │
│  - 홈   │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  - 현황 │   │ 현황 카드 │ │ 현황 카드 │ │ 현황 카드 │ │ 현황 카드 │    │
│  - 팀   │   └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
│  - 팀원  │   ┌────────────────────────────────────────────────┐  │
│  - 사업  │   │        참여율 차트 (개인별/팀별)               │  │
│  - 알림 │   └────────────────────────────────────────────────┘  │
│  - 설정 │   ┌─────────────────┐ ┌─────────────────────────────┐  │
│         │   │  알림/경고 패널  │ │    상세 데이터 테이블        │  │
│         │   └─────────────────┘ └─────────────────────────────┘  │
└─────────┴───────────────────────────────────────────────────────┘
```

## Key Visualizations
1. **개인별 참여율 게이지** — 원형 차트, 100% 초과 시 경고색
2. **참여율 히스토리** — 라인 차트, 6개월 추이
3. **팀별 현황** — 가로 막대 차트
4. **알림 현황** — 상태별 색상 구분된 카드

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-02 | Initial design system created | 따뜻한 친근한 톤, Organic/Natural aesthetic |
