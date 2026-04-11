import { Personnel } from '../src/modules/personnel/personnel.entity';

describe('Personnel Entity', () => {
  it('should create a valid personnel instance', () => {
    const personnel = new Personnel();
    personnel.id = 'test-id';
    personnel.employeeId = 'EMP001';
    personnel.name = 'John Doe';
    personnel.ssn = 'encrypted-ssn-here';
    personnel.department = 'Development';
    personnel.team = 'Backend Team';
    personnel.position = 'Senior Developer';
    personnel.positionAverageAnnualSalary = 45000000;
    personnel.employmentType = 'FULL_TIME';
    personnel.hireDate = new Date('2023-01-01');
    personnel.isActive = true;
    personnel.salaryValidity = {
      startDate: new Date('2023-01-01'),
      endDate: null,
    };

    expect(personnel.id).toBe('test-id');
    expect(personnel.employeeId).toBe('EMP001');
    expect(personnel.name).toBe('John Doe');
    expect(personnel.positionAverageAnnualSalary).toBe(45000000);
    expect(personnel.employmentType).toBe('FULL_TIME');
    expect(personnel.isActive).toBe(true);
  });
});
