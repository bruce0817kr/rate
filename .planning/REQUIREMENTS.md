# Requirements: GTP 참여율 관리 시스템

**Defined:** 2026-04-09
**Core Value:** 운영자가 깨지지 않은 한글 UI와 신뢰할 수 있는 참여율·인건비 수치로 사업 현황을 즉시 판단할 수 있어야 한다.

## v1 Requirements

### Dashboard

- [ ] **DASH-01**: 대시보드의 모든 제목, 설명, 경고 텍스트가 정상 한글로 보인다.
- [ ] **DASH-02**: 개인별 참여율 현황은 정상/주의/위험 분포와 상위 참여 인력을 명확히 보여준다.
- [ ] **DASH-03**: 팀별 참여율 현황은 가로축 팀, 세로축 참여율(%) 기준으로 표시된다.
- [ ] **DASH-04**: 월 인건비 지표는 실제 참여 인력 배정 데이터 기준으로 계산된다.

### Formatting

- [ ] **FMT-01**: 퍼센트 표기는 `50.0%` 형식으로 일관되게 노출된다.
- [ ] **FMT-02**: 금액은 천 단위 구분기호와 우측 정렬 기준을 유지한다.
- [ ] **FMT-03**: 팀/직급 기반 정렬이 기존 업무 규칙에 맞게 유지된다.

### Verification

- [ ] **VER-01**: 프런트엔드 빌드가 통과한다.
- [ ] **VER-02**: 도커 재기동 후 서비스가 정상 상태로 올라온다.

## v2 Requirements

### Dashboard Expansion

- **DASH-05**: 차트 drill-down 또는 상세 링크를 추가한다.
- **DASH-06**: centered/wide 레이아웃 전환에 맞춘 대시보드 재배치를 고도화한다.

## Out of Scope

| Feature | Reason |
|---------|--------|
| 신규 차트 라이브러리 추가 도입 | 현재 마일스톤은 기존 Recharts 기반 정합성 개선이 우선이다 |
| 대시보드 전면 재설계 | 이번 작업은 의미와 서식 보정이 핵심이며 정보 구조 전면 교체는 범위를 넘는다 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DASH-01 | Phase 1 | Pending |
| DASH-02 | Phase 1 | Pending |
| DASH-03 | Phase 1 | Pending |
| DASH-04 | Phase 1 | Pending |
| FMT-01 | Phase 2 | Pending |
| FMT-02 | Phase 2 | Pending |
| FMT-03 | Phase 2 | Pending |
| VER-01 | Phase 3 | Pending |
| VER-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after GSD autonomous bootstrap*
