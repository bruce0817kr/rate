import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/team-members', search: '' }),
  }),
  { virtual: true },
);

import { TeamMemberList } from './TeamMemberList';
import { apiService } from '../services/api';

jest.mock('../services/api', () => ({
  apiService: {
    getPersonnel: jest.fn(),
    getIndividualParticipations: jest.fn(),
    getTeams: jest.fn(),
    uploadPersonnelFile: jest.fn(),
    purgeMockPersonnel: jest.fn(),
    createPersonnel: jest.fn(),
  },
}));

jest.mock('../components/ui/Toast', () => ({
  showToast: jest.fn(),
}));

jest.mock('../components/charts/IndividualParticipationChart', () => ({
  IndividualParticipationChart: () => <div>chart</div>,
}));

describe('TeamMemberList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders live personnel data merged with participation data', async () => {
    (apiService.getPersonnel as jest.Mock).mockResolvedValue([
      {
        id: 'person-1',
        employeeId: 'EMP001',
        name: 'Live User',
        team: 'Platform Team',
        position: 'Researcher',
        isActive: true,
      },
    ]);
    (apiService.getIndividualParticipations as jest.Mock).mockResolvedValue([
      {
        personnelId: 'person-1',
        totalParticipationRate: 35,
        status: 'OK',
      },
    ]);
    (apiService.getTeams as jest.Mock).mockResolvedValue([]);

    render(<TeamMemberList />);

    await waitFor(() => expect(apiService.getPersonnel).toHaveBeenCalled());
    await waitFor(() => expect(apiService.getIndividualParticipations).toHaveBeenCalled());
    await waitFor(() => expect(apiService.getTeams).toHaveBeenCalled());
    const liveUserCell = await screen.findByText('Live User');
    const liveUserRow = liveUserCell.closest('tr');
    expect(liveUserRow).not.toBeNull();
    expect(within(liveUserRow as HTMLTableRowElement).getByText('Platform Team')).toBeInTheDocument();
    expect(within(liveUserRow as HTMLTableRowElement).getByText('35.0%')).toBeInTheDocument();
    expect(screen.queryByText('EMP010')).not.toBeInTheDocument();
  });
});
