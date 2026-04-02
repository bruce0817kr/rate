# 경기테크노파크 인건비 및 참여율 관리 SaaS

이 시스템은 경기테크노파크가 중앙정부 및 지자체의 사업을 수탁받아 운영할 때 발생하는 인건비 관리 및 참여율 계산을 지원하기 위한 SaaS 솔루션입니다.

## 📋 주요 기능

- **조직 전체 실시간 참여율 관리**: 팀 수준에서의 별도 계산을 넘어 재단 전체에서의 통합 관리
- **실제 인건비 기반 계산**: 직급별 평균 대신 실제 급여 데이터 활용으로 정산 정확도 향상
- **참여개월 수 기반 계산**: 재직일수/월일수 계산 불필요, 참여개월 수만으로 간소화된 계산식 적용
- **급여 정보 보안**: 정확한 연봉 대신 급여대역 사용으로 개인정보 보호 동시에 정확한 비용 계산 가능
- **크로스팀 참여 지원**: 한 직원이 여러 팀의 여러 사업에 동시에 참여할 수 있는 유연한 구조
- **PDF 규정 문서 관리**: 재단 관련 규정의 저장, 조회, 버전 관리 및 참조 기능
- **참여율 100% 상한 유지**: 기존 정책을 유지하면서도 더 정교한 검증 및 알림 시스템
- **포괄적인 감사 로그**: 모든 변경 사항의 불변 로그 저장 및 추적 가능
- **실시간 알림 시스템**: 참여율 상한 근접 시 사전 경고 및 긴급 알림

## 🏗️ 시스템 아키텍처

### 기술 스택
- **프론트엔드**: React 18 + TypeScript + Tailwind CSS
- **백엔드**: NestJS (Node.js) + TypeORM + PostgreSQL
- **인증**: JWT 기반 인증
- **문서 저장**: AWS S3 또는 Azure Blob Storage (PDF 규정)
- **캐싱**: Redis (세션 저장소 및 계산 결과 캐싱)
- **배포**: Docker + Kubernetes 또는 클라우드네이티브 옵션

### 마이크로서비스 구조
```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│   프론트엔드    │◄──►│   API 게이트웨이   │◄──►│   인증/권한 서비스   │
│ (React SPA)     │    │ (Rate Limiting)  │    │ (JWT/OAuth/OIDC)     │
└─────────────────┘    └──────────────────┘    └────────────────────┘
                                      │
                                      ▼
                           ┌────────────────────┐
                           │   애플리케이션 서비스  │
                           │  (마이크로서비스)    │
                           └────────────────────┘
                                      │
        ┌───────────────┬───────────────┼───────────────┐
        ▼               ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│사업 관리    │  │인력 관리    │  │인건비 계산  │  │참여율 관리  │
│서비스       │  │서비스       │  │엔진         │  │엔진         │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
        │               │               │               │
        ▼               ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│규제 규칙    │  │증빙 관리    │  │감사 로그    │  │보고서 생성  │
│엔진         │  │서비스       │  │서비스       │  │서비스       │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
        │               │               │               │
        └───────────────┴───────────────┴───────────────┘
                                        ▼
                                 ┌─────────────────┐
                                 │   데이터베이스  │
                                 │ (PostgreSQL)    │
                                 └─────────────────┘
                                        │
                                        ▼
                                 ┌─────────────────┐
                                 │     캐시/검색   │
                                 │ (Redis/ES)      │
                                 └─────────────────┘
                                        │
                                        ▼
                                 ┌─────────────────┐
                                 │문서 관리 서비스 │
                                 │(PDF 규정 저장)  │
                                 └─────────────────┘
```

## ⚙️ 설치 및 실행 방법

### 사전 요구사항
- Node.js 18 이상
- PostgreSQL 13 이상
- Docker 및 Docker Compose (선택사항)
- npm 또는 yarn

### 백엔드 설정

1. 백엔드 디렉토리로 이동:
   ```bash
   cd saas-project/backend
   ```

2. 의존성 설치:
   ```bash
   npm install
   ```

3. 환경 변수 설정:
   ```bash
   cp .env.example .env
   ```
   `.env` 파일을 편집하여 다음 값들을 설정:
   ```
   # 데이터베이스 연결
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_NAME=personnel_saas

   # JWT 설정
   JWT_SECRET=your-secret-key-change-in-production

   # 포트 설정
   PORT=3000
   ```

4. 데이터베이스 초기화:
   ```bash
   # PostgreSQL이 실행 중인지 확인하고 데이터베이스 생성
   createdb personnel_saas
   ```

5. 백엔드 실행:
   ```bash
   npm run start:dev
   ```

### 프론트엔드 설정

1. 프론트엔드 디렉토리로 이동:
   ```bash
   cd saas-project/frontend
   ```

2. 의존성 설치:
   ```bash
   npm install
   ```

3. 개발 서버 실행:
   ```bash
   npm start
   ```

   프론트엔드는 기본적으로 `http://localhost:3000`에서 실행되며, 백엔드(`http://localhost:3000`)에 자동으로 연결됩니다.

### Docker를 사용한 전체 설정 (선택사항)

1. 프로젝트 루트 디렉토리로 이동:
   ```bash
   cd saas-project
   ```

2. Docker Compose로 모든 서비스 실행:
   ```bash
   docker-compose up --build
   ```

3. 서비스 접근:
   - 프론트엔드: http://localhost:3000
   - 백엔드 API: http://localhost:3000/api
   - API 문서: http://localhost:3000/api (Swagger UI 설정 시)

## 📖 API 엔드포인트

### 인력 관리 (Personnel)
- `POST /personnel` - 새 인력 생성
- `GET /personnel` - 모든 인력 조회
- `GET /personnel/:id` - 특정 인력 조회
- `PATCH /personnel/:id` - 인력 정보 수정
- `DELETE /personnel/:id` - 인력 삭제
- `GET /personnel/employee/:employeeId` - 사번으로 인력 조회
- `PATCH /personnel/:id/deactivate` - 인력 비활성화

### 프로젝트 관리 (Projects)
- `POST /projects` - 새 프로젝트 생성
- `GET /projects` - 모든 프로젝트 조회
- `GET /projects/:id` - 특정 프로젝트 조회
- `PATCH /projects/:id` - 프로젝트 정보 수정
- `DELETE /projects/:id` - 프로젝트 삭제
- `GET /projects/team/:team` - 특정 팀이 주관하는 프로젝트 조회
- `GET /projects/participating-team/:team` - 특정 팀이 참여하는 프로젝트 조회

### 참여 관리 (ProjectPersonnel)
- `POST /project-personnel` - 새 참여 관계 생성
- `GET /project-personnel` - 모든 참여 관계 조회
- `GET /project-personnel/:id` - 특정 참여 관계 조회
- `PATCH /project-personnel/:id` - 참여 관계 수정
- `DELETE /project-personnel/:id` - 참여 관계 삭제
- `GET /project-personnel/project/:projectId` - 특정 프로젝트의 모든 참여 관계 조회
- `GET /project-personnel/personnel/:personnelId` - 특정 인력의 모든 참여 관계 조회

### 참여 모니터링 (ParticipationMonitoring)
- `GET /participation-monitoring/alerts` - 모든 참여 관련 알림 조회
- `GET /participation-monitoring/team-utilization` - 팀별 활용도 현황 조회
- `GET /participation-monitoring/validate-individual` - 개인 참여율 제한 검증
- `GET /participation-monitoring/validate-team` - 팀 참여율 제한 검증
- `GET /participation-monitoring/validate-project` - 프로젝트 참여율 제한 검증
- `POST /participation-monitoring/acknowledge-alert/:alertId` - 알림 확인 처리

## 🔒 보안 기능

- **JWT 기반 인증**: 모든 API 엔드포인트는 JWT 토큰을 통한 인증이 필요합니다.
- **개인정보 보호**: 
  - 주민등록번호는 암호화되어 저장됩니다.
  - 정확한 급여 대신 급여대역(예: "3000-4000")을 사용하여 개인정보를 보호합니다.
- **역할 기반 접근 제어**: 향후 확장성을 위해 설계되었습니다.
- **감사 로그**: 모든 데이터 변경 사항은 불변 로그로 저장되어 추적이 가능합니다.

## 🧪 테스트 실행

### 백엔드 테스트
```bash
cd saas-project/backend
npm run test
```

### 특정 테스트 파일 실행
```bash
npm run test -- src/modules/participation/participation-calculation.service.spec.ts
```

## 📄 환경 변수 설정 가이드

### 필수 환경 변수
| 변수명 | 설명 | 기본값 | 필수 여부 |
|--------|------|--------|-----------|
| DB_HOST | 데이터베이스 호스트 | localhost | 예 |
| DB_PORT | 데이터베이스 포트 | 5432 | 예 |
| DB_USERNAME | 데이터베이스 사용자명 | postgres | 예 |
| DB_PASSWORD | 데이터베이스 비밀번호 | (필수 설정) | 예 |
| DB_NAME | 데이터베이스 이름 | personnel_saas | 예 |
| JWT_SECRET | JWT 서명 키 | your-secret-key-change-in-production | 예 |
| PORT | 서버 포트 | 3000 | 아니오 |

### 선택적 환경 변수
| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| NODE_ENV | 노드 환경 (development/production/test) | development |
| LOG_LEVEL | 로그 레벨 | info |
| CORS_ORIGIN | CORS 허용 오리진 | * |
| RATE_LIMIT_WINDOW | Rate limiting 창 크기 (ms) | 900000 (15분) |
| RATE_LIMIT_MAX_REQUESTS | 창당 최대 요청 수 | 100 |

## 📊 데이터 모델 개요

### 핵심 엔티티

#### Personnel (인력)
- id: UUID (Primary Key)
- employeeId: 문자열 (고유, 사번)
- name: 문자열
- ssn: 문자열 (암호화 저장)
- department: 문자열
- team: 문자열 (현재 소속 팀)
- position: 문자열
- salaryBand: 문자열 (예: "3000-4000", 단위: 만원)
- employmentType: ENUM (FULL_TIME, CONTRACT, PART_TIME, DISPATCHED)
- hireDate: 날짜
- terminationDate: nullable 날짜
- isActive: boolean
- salaryValidity: JSONB (시작일, 종료일) - 급여 변경 이력 추적용

#### Project (사업)
- id: UUID (Primary Key)
- name: 문자열
- projectType: ENUM (NATIONAL_RD, LOCAL_SUBSIDY, MIXED)
- managingDepartment: 문자열
- startDate: 날짜
- endDate: 날짜
- totalBudget: 숫자
- personnelBudget: 숫자
- status: ENUM (PLANNING, APPROVED, IN_PROGRESS, COMPLETED, AUDITING)
- legalBasis: JSONB (적용되는 법령 및 고시 버전)
- internalRules: JSONB (경기TP 자체 규정)
- managingTeam: 문자열
- participatingTeams: 문자열 배열

#### ProjectPersonnel (과제참여)
- id: UUID (Primary Key)
- project_id: FK → Project
- personnel_id: FK → Personnel
- participationRate: 소수점 (0-100)
- startDate: 날짜
- endDate: nullable 날짜
- calculationMethod: ENUM (MONTHLY, DAILY, HOURLY)
- expenseCode: 문자열
- legalBasisCode: 문자열
- participatingTeam: 문자열
- notes: nullable 문자열
- version: 정수 (동시성 제어)

#### PersonnelCost (인건비계상)
- id: UUID (Primary Key)
- projectPersonnel_id: FK → ProjectPersonnel
- fiscalYear: 정수
- fiscalMonth: 정수 (1-12)
- calculationDate: 날짜
- baseSalary: 숫자 (실제 급여 데이터에서 가져옴)
- appliedParticipationRate: 소수점
- calculatedAmount: 숫자
- expenseItem: 문자열
- 4대보험구분: ENUM (개인부담, 기관부담, 전액인정)
- 문서상태: ENUM (미제출, 제출중, 승인완료, 반송)

#### AuditLog (감사로그)
- id: UUID (Primary Key)
- 엔티티타입: 문자열
- 엔티티_id: UUID
- 작업유형: ENUM (CREATE, UPDATE, DELETE)
- 변경내용: JSONB
- 작업자_id: 문자열
- 작업일시: 타임스탬프
- IP주소: nullable 문자열
- UserAgent: nullable 문자열

#### RegulationDocument (규정문서)
- id: UUID (Primary Key)
- 제목: 문자열
- 설명: 텍스트
- 파일경로: 문자열 (S3/Blob storage 경로)
- 파일유형: ENUM (PDF, HWP, DOC, etc.)
- 버전: 문자열
- 적용시작일: 날짜
- 적용종료일: nullable 날짜
- 관련사업유형: ENUM 배열
- 관련팀: 문자열 배열

## 🚀 배포 가이드

### 프로덕션 배포 준비사항

1. **환경 변수 보안 설정**:
   - 실제 배포 시에는 `.env` 파일에 실제 값을 설정하고, 이를 버전 관리에서 제외해야 합니다.
   - Kubernetes 시크릿 또는 Docker 시크릿을 사용하여 민감한 정보를 관리하는 것이 권장됩니다.

2. **데이터베이스 설정**:
   - 프로덕션에서는 `synchronize: false`를 사용하고, 마이그레이션 스크립트를 통해 데이터베이스 스키마를 관리해야 합니다.
   - 정기적인 백업 및 복구 절차를 수립해야 합니다.

3. **로그 및 모니터링**:
   - 애플리케이션 로그를 중앙집중식 로깅 시스템(ELK 스택, Datadog 등)으로 전송하는 것을 고려하세요.
   - 성능 모니터링 및 알림 시스템을 설정하세요.

4. **보안 강화**:
   - HTTPS를 사용하여 모든 통신을 암호화하세요.
   - 정기적인 보안 취약점 점검을 수행하세요.
   - 의존성 패키지의 보안 업데이트를 정기적으로 적용하세요.

### Docker를 사용한 프로덕션 배포

1. **프로덕션용 Dockerfile 최적화**:
   - 멀티스테이지 빌드를 사용하여 이미지 크기를 최소화하세요.
   - 불필요한 개발 도구와 패키지를 제거하세요.

2. **Docker Compose 프로덕션 버전**:
   - 별도의 `docker-compose.prod.yml` 파일을 생성하여 프로덕션 설정을 관리하세요.
   - 볼륨을 영구 스토리지로 설정하여 데이터 손실을 방지하세요.
   - 재시작 정책을 설정하여 서비스가 예기치 않게 중지될 때 자동으로 재시작되도록 하세요.

3. **Kubernetes 배포** (고급 옵션):
   - Deployment, Service, ConfigMap, Secret 리소스를 정의하세요.
   - Horizontal Pod Autoscaler를 사용하여 트래픽에 따라 자동으로 스케일링하세요.
   - Ingress 컨트롤러를 설정하여 외부 접근을 관리하세요.

## 📞 지원 및 문의

문제가 발생하거나 기능에 대한 질문이 있는 경우, 다음 채널을 통해 문의해 주세요:

- 내부 개발팀: 개발팀 내부 채널
- 문의 사항: saas-support@gwanggi-techno-park.kr
- 긴급 상황: 운영팀 전화 (내선 번호)

## 📝 라이선스

이 소프트웨어는 내부 사용을 위한 proprietary 솔루션입니다. 무단 복제, 배포, 수정을 금합니다.

© 2026 경기테크노파크. 모든 권리 보유.