# Salary Average Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove salary bands, make position average annual salary the default pay model, and restrict actual salary overrides to explicitly authorized users.

**Architecture:** Replace band-range parsing with a single numeric salary-setting model keyed by position. Keep project-level actual salary as a masked override, and centralize pay visibility/authorization in backend responses so frontend rendering becomes a thin consumer of server policy.

**Tech Stack:** NestJS, TypeORM, React, TypeScript, Jest, React Testing Library

---

## File Map

- Modify: `backend/src/modules/users/user.entity.ts`
- Modify: `backend/src/modules/users/dto/create-user.dto.ts`
- Modify: `backend/src/modules/users/users.service.ts`
- Modify: `backend/src/modules/users/users.controller.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/personnel/personnel.entity.ts`
- Modify: `backend/src/modules/personnel/dto/create-personnel.dto.ts`
- Modify: `backend/src/modules/personnel/personnel.service.ts`
- Modify: `backend/src/modules/personnel/personnel.controller.ts`
- Modify: `backend/src/modules/participation/project-personnel.entity.ts`
- Modify: `backend/src/modules/participation/dto/create-project-personnel.dto.ts`
- Modify: `backend/src/modules/participation/dto/update-project-personnel.dto.ts`
- Modify: `backend/src/modules/participation/project-personnel.service.ts`
- Modify: `backend/src/modules/participation/participation-calculation.service.ts`
- Modify: `backend/src/modules/participation/participation-monitoring.service.ts`
- Replace/rename in place: `backend/src/modules/salary-bands/*`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/modules/upload/upload.service.ts`
- Modify: `backend/personnel_template.csv`
- Modify: `backend/seeds/personnel_upload.csv`
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/context/AuthContext.tsx`
- Modify: `frontend/src/pages/Settings.tsx`
- Modify: `frontend/src/pages/ProjectDetail.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/pages/TeamMemberDetail.tsx`
- Modify: `frontend/src/components/modals/TeamMemberModal.tsx`
- Modify: `frontend/public/templates/personnel_template.csv`
- Test: `backend/test/participation-calculation.service.spec.ts`
- Test: `backend/test/personnel.entity.spec.ts`
- Test: `backend/src/modules/users/users.service.spec.ts`
- Test: `backend/src/modules/participation/project-personnel.service.spec.ts`

### Task 1: Lock Backend Authorization And Naming With Tests

**Files:**
- Modify: `backend/src/modules/users/users.service.spec.ts`
- Modify: `backend/src/modules/participation/project-personnel.service.spec.ts`
- Test: `backend/test/participation-calculation.service.spec.ts`

- [ ] **Step 1: Write failing tests for the new permission and salary fallback policy**

Add tests that prove:

```ts
it('includes canManageActualSalary in public user payloads', async () => {
  usersRepository.find.mockResolvedValue([
    { id: 'u1', username: 'planner@gtp.or.kr', name: 'Planner', role: UserRole.STRATEGY_PLANNING, isActive: true, canManageActualSalary: true, createdAt: new Date() },
  ]);

  const result = await service.findAll();

  expect(result[0]).toMatchObject({ canManageActualSalary: true });
});

it('prefers actualAnnualSalaryOverride over position average salary', async () => {
  const amount = service.getApplicableAnnualSalary({
    actualAnnualSalaryOverride: 72000000,
    personnel: { positionAverageAnnualSalary: 61000000 },
  } as any);

  expect(amount).toBe(72000000);
});

it('falls back to position average salary when override is missing', async () => {
  const amount = service.getApplicableAnnualSalary({
    actualAnnualSalaryOverride: null,
    personnel: { positionAverageAnnualSalary: 61000000 },
  } as any);

  expect(amount).toBe(61000000);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --runInBand backend/src/modules/users/users.service.spec.ts backend/src/modules/participation/project-personnel.service.spec.ts backend/test/participation-calculation.service.spec.ts`

Expected: FAIL because `canManageActualSalary`, `actualAnnualSalaryOverride`, and average-salary fallback behavior do not exist yet.

- [ ] **Step 3: Implement minimal backend type and helper changes**

Introduce:

```ts
@Column({ default: false })
canManageActualSalary: boolean;
```

and a reusable helper:

```ts
getApplicableAnnualSalary(projectPersonnel: Pick<ProjectPersonnel, 'actualAnnualSalaryOverride' | 'personnel'>): number {
  return Number(projectPersonnel.actualAnnualSalaryOverride ?? projectPersonnel.personnel?.positionAverageAnnualSalary ?? 0);
}
```

- [ ] **Step 4: Re-run the targeted tests**

Run: `npm test -- --runInBand backend/src/modules/users/users.service.spec.ts backend/src/modules/participation/project-personnel.service.spec.ts backend/test/participation-calculation.service.spec.ts`

Expected: PASS for the newly added cases.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/users backend/src/modules/participation backend/test/participation-calculation.service.spec.ts
git commit -m "Define salary override authorization and fallback behavior"
```

### Task 2: Replace Salary Band Model With Position Average Salary Settings

**Files:**
- Modify: `backend/src/modules/salary-bands/salary-band.entity.ts`
- Modify: `backend/src/modules/salary-bands/salary-bands.service.ts`
- Modify: `backend/src/modules/salary-bands/salary-bands.controller.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/pages/Settings.tsx`

- [ ] **Step 1: Write failing tests for average salary setting CRUD**

Add service tests like:

```ts
it('stores a single averageAnnualSalary per position', async () => {
  repository.findOne.mockResolvedValue(null);
  repository.create.mockReturnValue({ position: '선임연구원', averageAnnualSalary: 62000000, isActive: true });
  repository.save.mockResolvedValue({ id: 's1', position: '선임연구원', averageAnnualSalary: 62000000, isActive: true });

  const result = await service.create({ position: '선임연구원', averageAnnualSalary: 62000000 });

  expect(result.averageAnnualSalary).toBe(62000000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand backend/src/modules/salary-bands/salary-bands.service.spec.ts`

Expected: FAIL because the DTO/entity still expect `minAmount` and `maxAmount`.

- [ ] **Step 3: Implement the single-value salary setting model**

Refactor the model to:

```ts
export class SalaryBand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  position: string;

  @Column('bigint')
  averageAnnualSalary: number;

  @Column({ default: true })
  isActive: boolean;
}
```

Update controller/service/frontend API contracts from `{ minAmount, maxAmount }` to `{ averageAnnualSalary }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand backend/src/modules/salary-bands/salary-bands.service.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/salary-bands backend/src/app.module.ts frontend/src/services/api.ts frontend/src/pages/Settings.tsx
git commit -m "Replace salary bands with position average salary settings"
```

### Task 3: Remove Salary Band Dependence From Personnel And Calculation Paths

**Files:**
- Modify: `backend/src/modules/personnel/personnel.entity.ts`
- Modify: `backend/src/modules/personnel/dto/create-personnel.dto.ts`
- Modify: `backend/src/modules/personnel/personnel.controller.ts`
- Modify: `backend/src/modules/personnel/personnel.service.ts`
- Modify: `backend/src/modules/participation/participation-calculation.service.ts`
- Modify: `backend/src/modules/participation/participation-monitoring.service.ts`
- Modify: `backend/src/modules/upload/upload.service.ts`

- [ ] **Step 1: Write failing tests for position average salary instead of salary band parsing**

Add tests like:

```ts
it('uses positionAverageAnnualSalary directly without parsing salary bands', () => {
  const amount = service.calculateMonthlyCost(
    { positionAverageAnnualSalary: 60000000 } as any,
    { participationRate: 50, actualAnnualSalaryOverride: null } as any,
    1,
  );

  expect(amount).toBe(2500000);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --runInBand backend/test/participation-calculation.service.spec.ts backend/test/personnel.entity.spec.ts`

Expected: FAIL because personnel still expose `salaryBand`.

- [ ] **Step 3: Implement direct numeric salary handling**

Update personnel to expose:

```ts
@Column('bigint', { nullable: true })
positionAverageAnnualSalary: number | null;
```

and replace salary-band parsing with:

```ts
const annualSalary = Number(projectPersonnel.actualAnnualSalaryOverride ?? personnel.positionAverageAnnualSalary ?? 0);
const monthlyCost = (annualSalary / 12) * (projectPersonnel.participationRate / 100) * participationMonths;
```

- [ ] **Step 4: Re-run targeted tests**

Run: `npm test -- --runInBand backend/test/participation-calculation.service.spec.ts backend/test/personnel.entity.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/personnel backend/src/modules/participation backend/src/modules/upload backend/test/participation-calculation.service.spec.ts backend/test/personnel.entity.spec.ts
git commit -m "Use numeric average salaries across personnel calculations"
```

### Task 4: Enforce Actual Salary Override Masking In Backend Responses

**Files:**
- Modify: `backend/src/modules/participation/project-personnel.service.ts`
- Modify: `backend/src/modules/participation/project-personnel.controller.ts`
- Modify: `backend/src/modules/users/users.controller.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `frontend/src/context/AuthContext.tsx`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Write failing tests for masked response behavior**

Add tests like:

```ts
it('returns null actualAnnualSalaryOverride for unauthorized viewers', async () => {
  const result = await service.maskActualSalaryOverride(
    { actualAnnualSalaryOverride: 72000000 } as any,
    { role: UserRole.GENERAL, canManageActualSalary: false } as any,
  );

  expect(result.actualAnnualSalaryOverride).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --runInBand backend/src/modules/participation/project-personnel.service.spec.ts backend/src/modules/users/users.service.spec.ts`

Expected: FAIL because masking helpers and user flag exposure are missing.

- [ ] **Step 3: Implement masking and frontend auth helpers**

Add backend helper:

```ts
private canManageActualSalary(user?: Pick<User, 'role' | 'canManageActualSalary'> | null): boolean {
  return !!user && (user.role === UserRole.ADMIN || user.canManageActualSalary);
}
```

Use it to return `actualAnnualSalaryOverride: null` for unauthorized viewers.

Expose frontend helper:

```ts
const canManageActualSalary = useCallback(() => !!user && (user.role === 'ADMIN' || user.canManageActualSalary === true), [user]);
```

- [ ] **Step 4: Re-run targeted tests**

Run: `npm test -- --runInBand backend/src/modules/participation/project-personnel.service.spec.ts backend/src/modules/users/users.service.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/participation backend/src/modules/users backend/src/modules/auth frontend/src/context/AuthContext.tsx frontend/src/services/api.ts
git commit -m "Mask actual salary overrides for unauthorized users"
```

### Task 5: Convert Frontend Screens From Salary Bands To Average Salary

**Files:**
- Modify: `frontend/src/pages/Settings.tsx`
- Modify: `frontend/src/pages/ProjectDetail.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/pages/TeamMemberDetail.tsx`
- Modify: `frontend/src/components/modals/TeamMemberModal.tsx`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Write failing frontend tests for display policy**

Add tests that prove:

```tsx
expect(screen.getByText('직급별 평균 연봉')).toBeInTheDocument();
expect(screen.queryByText('실제 연봉(원)')).not.toBeInTheDocument();
expect(screen.getByText('기준 평균 연봉')).toBeInTheDocument();
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --runInBand frontend/src/App.test.tsx`

Expected: FAIL because the UI still uses salary-band labels and always shows the project salary input.

- [ ] **Step 3: Implement the UI conversion**

Make these replacements:

```ts
type PositionSalarySettingRecord = {
  id: string;
  position: string;
  averageAnnualSalary: number;
  isActive: boolean;
};
```

```tsx
{canManageActualSalary() && (
  <input
    value={formatWithComma(draft.actualAnnualSalaryOverride ?? '')}
    onChange={...}
  />
)}
```

and calculate with:

```ts
const baseAnnualSalary = Number(assignment.personnel?.positionAverageAnnualSalary ?? 0);
const appliedAnnualSalary = Number(assignment.actualAnnualSalaryOverride ?? baseAnnualSalary);
```

- [ ] **Step 4: Re-run targeted frontend tests**

Run: `npm test -- --runInBand frontend/src/App.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/api.ts frontend/src/context/AuthContext.tsx frontend/src/pages frontend/src/components/modals/TeamMemberModal.tsx
git commit -m "Show average salaries by default and gate actual salary inputs"
```

### Task 6: Update Templates, Seed Data, And Regression Checks

**Files:**
- Modify: `backend/personnel_template.csv`
- Modify: `backend/seeds/personnel_upload.csv`
- Modify: `frontend/public/templates/personnel_template.csv`
- Modify: `README.md`
- Modify: `DATABASE_SCHEMA.md`

- [ ] **Step 1: Write failing assertions for template/schema drift**

Add test or snapshot checks that expect:

```txt
employeeId,name,...,position,positionAverageAnnualSalary,employmentType,hireDate
```

- [ ] **Step 2: Run targeted checks**

Run: `npm test -- --runInBand backend/src/modules/upload/upload.service.spec.ts`

Expected: FAIL until templates and upload parsing are updated.

- [ ] **Step 3: Update templates and docs**

Replace `salaryBand` references with `positionAverageAnnualSalary` or explicit position-only guidance, and align docs with the new permission model.

- [ ] **Step 4: Run project verification**

Run:

```bash
npm test -- --runInBand
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/personnel_template.csv backend/seeds/personnel_upload.csv frontend/public/templates/personnel_template.csv README.md DATABASE_SCHEMA.md
git commit -m "Align templates and docs with average salary model"
```

## Self-Review

- Spec coverage:
  - Average salary setting model: Task 2
  - User-level actual-salary permission flag: Task 1 and Task 4
  - Project-level override semantics: Task 1, Task 3, Task 4, Task 5
  - Frontend visibility policy: Task 5
  - Upload/template/doc cleanup: Task 6
- Placeholder scan:
  - No `TODO` or deferred implementation placeholders remain.
- Type consistency:
  - Use `canManageActualSalary`, `positionAverageAnnualSalary`, and `actualAnnualSalaryOverride` consistently across backend and frontend tasks.
