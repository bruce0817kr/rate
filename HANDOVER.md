# 경기테크노파크 인건비 관리 시스템 - 인수인계서

**작성일**: 2026-04-03  
**최종 작성자**: AI Assistant (Sisyphus)
**최종 업데이트**: 2026-04-24 (2026-04-21 작업 반영)

---

## 1. 프로젝트 개요

### 1.1 목적
경기테크노파크 연구인력의 사업별 참여율을 관리하고, 3책/5공 규칙(연구책임자 최대 3개, 총 역할 최대 5개)을 자동으로 enforcement하며, 인건비를 산정하는 SaaS 시스템

### 1.2 기술 스택

| 구분 | 기술 |
|------|------|
| **Backend** | NestJS + TypeScript + TypeORM + PostgreSQL |
| **Frontend** | React 19 + TypeScript + Recharts |
| **Container** | Docker + Docker Compose |
| **Authentication** | JWT (Access Token 60분) |

### 1.3 프로젝트 구조

```
saas-project/
├── backend/                 # NestJS 백엔드
│   └── src/
│       ├── modules/
│       │   ├── auth/       # JWT 인증, 역할 기반 접근 제어
│       │   ├── users/      # 사용자 CRUD
│       │   ├── audit/      # 감사 로깅
│       │   ├── participation/      # 참여율 모니터링
│       │   ├── personnel/   # 인력 관리
│       │   ├── projects/   # 사업 관리
│       │   ├── documents/  # 문서 관리
│       │   └── regulations/ # 규정 관리
│       ├── app.module.ts
│       └── main.ts
├── frontend/               # React 프론트엔드
│   └── src/
│       ├── pages/          # Dashboard, TeamMemberList, ProjectList 등
│       ├── components/      # UI 컴포넌트
│       ├── context/        # AuthContext
│       ├── services/       # api.ts
│       └── styles/         # 전역 스타일
├── docker-compose.yml
├── DATABASE_SCHEMA.md
├── DESIGN.md
└── README.md
```

---

## 2. 데이터베이스 스키마

### 2.1 주요 엔티티

| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `users` | 시스템 사용자 | id, username, passwordHash, name, role (ADMIN/HR_FINANCE/GENERAL), isActive |
| `personnel` | 인력(팀원) | id, employeeId, name, team, position, salaryBand, highestEducation, educationYear |
| `project` | 사업 | id, name, startDate, endDate, status |
| `project_personnel` | 사업-인력 참여 관계 | id, projectId, personnelId, participationRate, role, startDate, endDate |
| `audit_logs` | 감사 로그 | id, entityType, entityId, action, changes, performedBy, ipAddress, timestamp |

### 2.2 역할 (UserRole)

| 역할 | 권한 |
|------|------|
| **ADMIN** | 모든 기능 접근, 사용자 관리, 실 임금 조회/입력, 감사 로그 조회 |
| **HR_FINANCE** | 실 임금 조회/입력, 급여대역 설정, 감사 로그 조회 |
| **GENERAL** | 대시보드, 팀원/사업 조회 (급여대역만), 참여율 조회 |

---

## 3. 구현 완료 기능

### 3.0 최신 작업 (2026-04-21)

| 기능 | 상태 | 파일 |
|------|------|------|
| 부서별 수입 현황 페이지 신규 추가 | ✅ | `DepartmentRevenue.tsx` |
| 엑셀 77개 사업 데이터 DB 적재 | ✅ | `import_revenue.py` → rate_db |
| `GET /api/projects/department-revenue` 엔드포인트 | ✅ | `projects.controller.ts`, `project.service.ts` |
| Dashboard 전체 팀 표시 (slice 제거) | ✅ | `Dashboard.tsx` |
| TeamMemberList 페이지네이션 (20건/페이지) | ✅ | `TeamMemberList.tsx` |
| ProjectList 페이지네이션 (20건/페이지) | ✅ | `ProjectList.tsx` |

#### DB 스키마 변경 (projects 테이블 컬럼 추가)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `expectedPersonnelRevenue` | numeric(15,2) | 예상 인건비 수입 |
| `expectedIndirectRevenue` | numeric(15,2) | 예상 간접비 수입 |
| `budgetStatus` | varchar(20) | 계속/신규/종료/폐지 |
| `fundingSources` | jsonb | {자체, 도비, 국비, 안산시, 타시군, 기타} |

#### 접속 정보
- DB: rate-postgres 컨테이너, port **5433**, rate_db / rate_user / rate_password
- 프론트엔드 URL: http://localhost:3033/gtp_rate (basename: `/gtp_rate`)
- 부서별 수입 현황: http://localhost:3033/gtp_rate/department-revenue

#### 미해결
- `personnel_costs` 테이블 현재 0건 → 예산 대비 실적 비교 불가 (예산만 표시)
- 실적 데이터 입력 시 "예상 vs 실적" 컬럼 자동 활성화 가능

---

### 3.1 작업 (2026-04-03)

| 기능 | 상태 | 파일 |
|------|------|------|
| 직급 체계 변경 (1급~7급, 공무직) | ✅ | `Settings.tsx`, `TeamMemberDetail.tsx` |
| 급여대역 실제 데이터 적용 | ✅ | DB personnel 테이블 |
| 인력 DB 115명 업로드 | ✅ | 엑셀 → CSV → DB |
| 팀 목록 새 조직 구조 반영 | ✅ | `TeamList.tsx` |
| 팀 상세 페이지 구현 | ✅ | `TeamDetail.tsx` (팀원별/사업별 인건비 표) |
| 인건비 한도 초과 경고 | ✅ | `TeamDetail.tsx` |
| 인건비 조정(-A) 기능 | ✅ | `TeamDetail.tsx` (참여율 조절 모달) |
| Docker 재빌드/재실행 | ✅ | docker-compose |

### 3.2 현재 직급 체계 (2025년 기준)

| 직급 | 급여대역 (만원) | 비고 |
|------|----------------|------|
| 원장 | 13,000-14,000 | |
| 부장 | 12,500-13,500 | |
| 차장 | 12,000-13,000 | |
| 팀장 | 10,800-12,600 | |
| 과장 | 10,000-12,000 | |
| 대리 | 8,800-9,700 | |
| 주임 | 5,900-6,600 | |
| 사원 | 4,900-5,500 | |
| 나급(대리) | 7,700-8,200 | 계약직 |
| 다급(주임) | 5,000-5,400 | 계약직 |
| 라급(사원) | 4,400-4,700 | 계약직 |
| 공무직가급 | 6,800-7,200 | 공무직 |
| 공무직나급 | 6,300-6,700 | 공무직 |
| 공무직다급 | 4,600-4,900 | 공무직 |

### 3.3 현재 조직 구조 (팀 목록)

|本部 | 팀 |
|------|-----|
| 원장실 | 윤리감사팀, 대외협력팀 |
| 전략사업본부 | 디지털전환팀, 제조로봇팀, 경기스마트제조혁신센터, 정책기획팀 |
| 기술지원본부 | 기술지원팀, 기술사업화팀, 경기지식재산센터 |
| 지역산업본부 | 혁신클러스터팀, 미래사업팀, 안산정보산업진흥센터 |
| 경영지원본부 | 인사총무팀, 재무회계팀, 시설안전팀 |

**총 인력**: 115명 (DB 등록 완료)

### 3.1 인증 및 인가 (Auth)

| 기능 | 상태 | 파일 |
|------|------|------|
| JWT 로그인 | ✅ | `auth.controller.ts`, `auth.service.ts` |
| 역할 기반 접근 제어 | ✅ | `roles.guard.ts`, `roles.decorator.ts` |
| Users CRUD | ✅ | `users.controller.ts`, `users.service.ts` |
| 비밀번호 해싱 (bcrypt) | ✅ | `users.service.ts` |

**로그인 응답 구조**:
```json
{
  "access_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "username": "admin",
    "name": "관리자",
    "role": "ADMIN"
  }
}
```

### 3.2 감사 로깅 (Audit)

| 기능 | 상태 | 파일 |
|------|------|------|
| 자동 감사 로깅 인터셉터 | ✅ | `audit.interceptor.ts` |
| AuditService | ✅ | `audit.service.ts` |
| AuditLog Entity | ✅ | `audit-log.entity.ts` |
| 프론트엔드 감사 로그 페이지 | ✅ | `AuditLogs.tsx` |

**감사 로그에 기록되는 작업**:
- POST (CREATE)
- PUT/PATCH (UPDATE)
- DELETE (DELETE)

**민감 정보 자동 숨김**: password, passwordHash, token, secret

### 3.3 프론트엔드 역할별 UI

| 기능 | 상태 | 파일 |
|------|------|------|
| AuthContext | ✅ | `AuthContext.tsx` |
| ProtectedRoute | ✅ | `ProtectedRoute.tsx` |
| 로그인 페이지 | ✅ | `Login.tsx` |
| 감사 로그 페이지 | ✅ | `AuditLogs.tsx` |
| 역할별 급여 숨김 | ✅ | `TeamMemberDetail.tsx` |
| 역할별 설정 접근 제어 | ✅ | `Settings.tsx` |
| 툴팁 안내 | ✅ | `Tooltip.tsx` |

### 3.4 역할별 접근 권한 요약

| 기능 | ADMIN | HR_FINANCE | GENERAL |
|------|:-----:|:-----------:|:-------:|
| 실 임금 조회 | ✅ | ✅ | ❌ |
| 실 임금 입력 | ✅ | ✅ | ❌ |
| 급여대역 설정 | ✅ | ✅ | ❌ |
| 감사 로그 조회 | ✅ | ✅ | ❌ |
| 사용자 관리 | ✅ | ❌ | ❌ |
| 모든 페이지 접근 | ✅ | ✅ | ✅ (급여 숨김) |

---

## 4. API 엔드포인트

### 4.1 인증 (Auth)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| POST | `/auth/login` | 로그인 | Public |

### 4.2 사용자 (Users)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| POST | `/users` | 사용자 생성 | ADMIN |
| GET | `/users` | 사용자 목록 | ADMIN, HR_FINANCE |
| GET | `/users/:id` | 사용자 상세 | ADMIN, HR_FINANCE |
| PATCH | `/users/:id` | 사용자 수정 | ADMIN |
| DELETE | `/users/:id` | 사용자 삭제 | ADMIN |

### 4.3 감사 로그 (Audit)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/audit/logs` | 감사 로그 조회 | ADMIN, HR_FINANCE |

### 4.4 인력 (Personnel)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/personnel` | 인력 목록 | Authenticated |
| POST | `/personnel` | 인력 생성 | - |
| PATCH | `/personnel/:id` | 인력 수정 | - |

### 4.5 사업 (Projects)

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/projects` | 사업 목록 | Authenticated |
| GET | `/projects/:id` | 사업 상세 | Authenticated |
| GET | `/projects/department-revenue?fiscalYear=2026` | 부서별 수입 현황 | Authenticated |

### 4.6 참여율 모니터링

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/participation-monitoring/team-utilization` | 팀별 활용률 | Authenticated |
| GET | `/participation-monitoring/individual` | 개인별 참여율 | Authenticated |
| GET | `/participation-monitoring/alerts` | 알림 목록 | Authenticated |

---

## 5. 주요 규정 (3책/5공)

### 5.1 규칙 설명

| 규칙 | 설명 | enforcement |
|------|------|-------------|
| **3책** | 연구책임자(PRINCIPAL_INVESTIGATOR) 역할은 최대 3개事业까지 | ✅ |
| **5공** | 모든 역할(含 연구책임자, 참여연구자) 합계 최대 5개 | ✅ |
| **100%** | 개인별 총 참여율은 100% 초과 불가 | ⚠️ UI 경고만 (백엔드 enforcement 미구현) |

### 5.2 역할 종류

| 역할 | 코드 | 설명 |
|------|------|------|
| 연구책임자 | PRINCIPAL_INVESTIGATOR | 3책 제한 적용 |
| 참여연구자 | PARTICIPATING_RESEARCHER | 5공 합계에 포함 |

---

## 6. 프론트엔드 페이지

| 페이지 | 경로 | 설명 |
|-------|------|------|
| 로그인 | `/login` | JWT 로그인 |
| 대시보드 | `/` | 현황 개요, 차트, 최근 알림 |
| 팀 목록 | `/teams` | 팀별 현황 |
| 팀원 목록 | `/team-members` | 전체 인력 목록 |
| 팀원 상세 | `/team-members/:id` | 개인 참여율, 급여대역 |
| 사업 목록 | `/projects` | 사업 목록 |
| 사업 상세 | `/projects/:id` | 사업별 참여 인력 |
| 알림 | `/alerts` | 참여율 경고, 이상 징후 |
| 설정 | `/settings` | 직급별 급여대역 |
| 감사 로그 | `/audit-logs` | 모든 변경 이력 (ADMIN/HR_FINANCE) |
| 부서별 수입 현황 | `/department-revenue` | 팀별 사업 예산 수입 현황 (77개 사업) |

---

## 7. Docker 배포

### 7.1 Docker Compose 구성

```yaml
services:
  backend:
    build: ./backend
    ports: ["3000:3000"]
    environment:
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=personnel_saas
      - DB_USERNAME=postgres
      - DB_PASSWORD=postgres
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports: ["80:80"]
    depends_on:
      - backend

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=personnel_saas
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 7.2 실행 명령

```bash
cd saas-project
docker-compose up --build
```

### 7.3 접속 URL

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost |
| 백엔드 API | http://localhost:3000 |
| PostgreSQL | localhost:5432 |

---

## 8. 환경 변수

### 8.1 백엔드 (.env)

```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=personnel_saas
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### 8.2 프론트엔드 (.env)

```env
REACT_APP_API_URL=http://localhost:3000/api
```

---

## 9. 빌드 및 실행

### 9.1 백엔드

```bash
cd saas-project/backend
npm install
npm run build
npm run start:dev  # 개발
npm run start:prod # 운영
```

### 9.2 프론트엔드

```bash
cd saas-project/frontend
npm install
npm run build
npm start          # 개발 (포트 3000)
# 프로덕션 빌드는 serve -s build
```

---

## 10. 테스트 계정

| 역할 | Username | Password | 설명 |
|------|----------|----------|------|
| ADMIN | admin | admin123 | 전체 권한 (DB에 실제 생성됨) |
| HR_FINANCE | - | - | 직접 생성 필요 |
| GENERAL | - | - | 직접 생성 필요 |

⚠️ **참고**: HR_FINANCE, GENERAL 계정은 직접 `docker exec rate-postgres psql`로 생성하거나 관리자 페이지에서 생성 필요.

---

## 11. 미구현 사항 및 개선 필요

### 11.1 백엔드

| 항목 | 상태 | 비고 |
|------|------|------|
| ParticipationRate 100% 초과 enforcement | ⚠️ | 현재 알림만 제공, блокировка 미구현 |
| 실제 DB 연동 | ⏳ | 사용자가 별도 입력 예정 |
| API 유효성 검사 | ⚠️ | 기본 class-validator 적용 |
| 프로젝트-인력 관계 CRUD | ⚠️ | 기본 구조만 존재 |

### 11.2 프론트엔드

| 항목 | 상태 | 비고 |
|------|------|------|
| 프로젝트 상세 페이지 완전 구현 | ⚠️ | 모달 등 일부 미구현 |
| 팀원 생성/편집 모달 | ⚠️ | UI만 존재 |
| 사업 참여자 추가/편집 모달 | ⚠️ | UI만 존재 |

### 11.3 운영 환경

| 항목 | 상태 | 비고 |
|------|------|------|
| HTTPS 설정 | ⏳ | Reverse proxy 필요 |
| DB 백업 | ⏳ |cron job 등 필요 |
| 로그 관리 | ⏳ | ELK 스택 등 |
| 모니터링 | ⏳ | Prometheus/Grafana |

---

## 12. 파일 구조 상세

### 12.1 백엔드 핵심 파일

```
backend/src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts      # 로그인 엔드포인트
│   │   ├── auth.module.ts          # AuthModule (UsersModule 참조)
│   │   ├── auth.service.ts         # 사용자 검증, JWT 생성
│   │   ├── jwt.strategy.ts         # Passport JWT 전략
│   │   ├── jwt-auth.guard.ts       # JWT 인증 가드
│   │   ├── roles.decorator.ts      # @Roles() 데코레이터
│   │   ├── roles.guard.ts          # 역할 기반 접근 제어
│   │   └── constants.ts            # JWT 시크릿
│   ├── users/
│   │   ├── user.entity.ts         # User 엔티티 + UserRole enum
│   │   ├── users.service.ts        # CRUD + bcrypt
│   │   ├── users.controller.ts     # Users API
│   │   ├── users.module.ts         # UsersModule
│   │   └── dto/
│   │       └── create-user.dto.ts
│   └── audit/
│       ├── audit-log.entity.ts     # AuditLog 엔티티
│       ├── audit.service.ts        # 감사 로깅
│       ├── audit.module.ts         # AuditModule
│       └── audit.interceptor.ts    # 자동 로깅 인터셉터
├── app.module.ts
└── main.ts
```

### 12.2 프론트엔드 핵심 파일

```
frontend/src/
├── App.tsx                      # 라우팅 (AuthProvider 래핑)
├── context/
│   └── AuthContext.tsx          # 인증 상태, 역할 헬퍼
├── components/
│   ├── ProtectedRoute.tsx        # 인증/역할 가드
│   └── ui/
│       ├── Tooltip.tsx          # 역할별 안내 툴팁
│       ├── Toast.tsx            # 알림 토스트
│       └── StatCard.tsx         # 대시보드 통계 카드
├── pages/
│   ├── Login.tsx                # 로그인 페이지
│   ├── Dashboard.tsx            # 대시보드
│   ├── TeamMemberList.tsx       # 팀원 목록
│   ├── TeamMemberDetail.tsx     # 팀원 상세 (급여 숨김 처리)
│   ├── ProjectList.tsx          # 사업 목록
│   ├── ProjectDetail.tsx        # 사업 상세
│   ├── Alerts.tsx               # 알림 목록
│   ├── Settings.tsx              # 설정 (역할별 접근 제어)
│   └── AuditLogs.tsx            # 감사 로그
└── services/
    └── api.ts                   # API 서비스 (JWT 자동 포함)
```

---

## 13. 이후 작업 권장사항

1. **실제 DB 연동 테스트**: Users 테이블-seed 데이터로 테스트 계정 생성
2. **뿌리控 검증**: ParticipationRate 100% 초과 시 блокировка
3. **프론트엔드 CRUD 완성**: 팀원/사업 모달 실제 연동
4. **E2E 테스트**: Playwright 등으로 핵심 플로우 테스트
5. **CI/CD 파이프라인**: GitHub Actions 등 구축
6. **문서화**: API 문서 (Swagger/OpenAPI) 자동 생성

---

## 14. 윈도우 컴퓨터 간 프로젝트 이동

### 14.1 방법: 폴더 통째로 복사

프로젝트 폴더를 그대로 복사하면 됩니다.

```powershell
# 기존 서버에서 (PowerShell 또는 명령 프롬프트)
xcopy /E /I C:\Project\rate \\새서버\C:\Project\rate
```

### 14.2 복사 후 작업

1. **Docker Desktop 실행** (대상 서버에서)
2. **DB 데이터 백업/복원** (볼륨 경로가 달라지므로)
   ```powershell
   # 기존 서버에서 백업
   cd C:\Project\rate\saas-project
   docker compose exec postgres pg_dump -Fc -U postgres > db_backup.dump
   
   # 대상 서버로 파일 복사 후 복원
   docker compose exec -T postgres pg_restore < db_backup.dump
   ```
3. **Docker 실행**
   ```powershell
   cd C:\Project\rate\saas-project
   docker compose up -d
   ```

### 14.3 검증

```powershell
docker compose ps           # 컨테이너 상태 확인
docker compose logs -f    # 로그 확인
```

### 14.4 주의사항

| 항목 | 설명 |
|------|------|
| **볼륨 경로** | Windows Docker Desktop과 호스트 간 경로가 다름 → `pg_dump/restore` 사용 권장 |
| **빌드 캐시** | 처음 실행 시 `--no-cache`로 빌드 권장 |
| **포트 충돌** | 3000, 3001, 5433 포트 사용 중인지 확인 |

---

## 15. 연락처 및 참고

- **프로젝트 README**: `saas-project/README.md`
- **설계 문서**: `saas-project/DESIGN.md`
- **DB 스키마**: `saas-project/DATABASE_SCHEMA.md`
- **구현 계획**: `saas-project/IMPLEMENTATION_PLAN.md`

---

**인수인계 완료** ✅  
추가 질문이 있으시면 언제든지 문의주세요.
