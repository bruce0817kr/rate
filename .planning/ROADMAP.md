# Roadmap: GTP 참여율 관리 시스템

## Overview

이번 마일스톤은 사용자에게 바로 드러나는 대시보드와 서식 품질을 정리하는 작업이다. 먼저 깨진 한글과 잘못된 지표 의미를 복구하고, 다음으로 퍼센트/금액/정렬 서식을 정돈한 뒤, 마지막으로 빌드와 도커 재기동까지 검증해 실제 반영 상태를 확보한다.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: 대시보드 한글 및 지표 복구** - 깨진 한국어와 잘못된 대시보드 의미를 정리한다.
- [ ] **Phase 2: 참여율/인건비 서식 정리** - 퍼센트, 금액, 정렬 및 차트 주변 UI 서식을 정리한다.
- [ ] **Phase 3: 검증 및 반영** - 프런트엔드 빌드와 도커 재기동으로 결과를 확인한다.

## Phase Details

### Phase 1: 대시보드 한글 및 지표 복구
**Goal**: 대시보드와 차트에 남아 있는 깨진 한글을 정상화하고, 개인별/팀별 참여율 및 월 인건비 지표 의미를 사용자 기준으로 맞춘다.
**Depends on**: Nothing (first phase)
**Requirements**: [DASH-01, DASH-02, DASH-03, DASH-04]
**Success Criteria** (what must be TRUE):
  1. 대시보드 카드, 제목, 설명, 툴팁이 한국어로 정상 출력된다.
  2. 개인별 참여율 차트는 정상/주의/위험 분포와 상위 참여 인력을 명확히 보여준다.
  3. 팀별 참여율 차트는 가로축 팀, 세로축 참여율(%) 기준으로 보인다.
  4. 월 인건비는 실제 참여 데이터 기준 계산값으로 표시된다.
**Plans**: 2 plans

Plans:
- [ ] 01-01: Dashboard.tsx 카드/에러/알림 텍스트 및 계산식 정리
- [ ] 01-02: 차트 컴포넌트 한국어/축/범례/툴팁 정리

### Phase 2: 참여율/인건비 서식 정리
**Goal**: 팀원, 사업, 참여 인력 화면 전반의 퍼센트/금액/정렬 서식을 업무 규칙에 맞게 통일한다.
**Depends on**: Phase 1
**Requirements**: [FMT-01, FMT-02, FMT-03]
**Success Criteria** (what must be TRUE):
  1. 참여율 표기가 `050.00%` 같은 형식이 아니라 `50.0%` 형태로 일관된다.
  2. 금액 표시는 천 단위 구분기호와 우측 정렬 기준을 유지한다.
  3. 팀 기준 정렬 시 직급 우선순위와 이름 오름차순 규칙이 유지된다.
**Plans**: 2 plans

Plans:
- [ ] 02-01: 팀원/사업 관련 퍼센트 및 금액 포맷 정리
- [ ] 02-02: 정렬/표기 잔여 UI 보정

### Phase 3: 검증 및 반영
**Goal**: 프런트 빌드와 도커 재기동을 통해 변경 사항이 실제 서비스에 반영 가능한 상태임을 확인한다.
**Depends on**: Phase 2
**Requirements**: [VER-01, VER-02]
**Success Criteria** (what must be TRUE):
  1. `frontend` 빌드가 성공한다.
  2. 도커 재빌드 후 주요 서비스가 실행 상태다.
  3. 진행 결과가 상태 문서에 기록된다.
**Plans**: 2 plans

Plans:
- [ ] 03-01: 프런트엔드 빌드 검증
- [ ] 03-02: 도커 재빌드 및 상태 확인

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. 대시보드 한글 및 지표 복구 | 2/2 | Complete | 2026-04-09 |
| 2. 참여율/인건비 서식 정리 | 0/2 | Not started | - |
| 3. 검증 및 반영 | 0/2 | Not started | - |
