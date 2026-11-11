import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IdentityBox } from './IdentityBox';
import { ActiveHoldCard } from './ActiveHoldCard';
import { ClassList } from './ClassList';
import { ActiveHoldState } from '../types/admission';

describe('Frontend Component Tests (Step 8 & 9)', () => {
  it('IdentityBox: shows error for invalid/partial ID and success for 17 digits', () => {
    const onStudentIdChange = vi.fn();
    const { rerender } = render(
      <IdentityBox studentId="12345" onStudentIdChange={onStudentIdChange} />
    );

    expect(screen.getByText(/12 সংখ্যা বাকি/)).toBeInTheDocument();

    rerender(
      <IdentityBox studentId="20051234567890123" onStudentIdChange={onStudentIdChange} />
    );
    expect(screen.getByText(/শনাক্তকরণ সম্পন্ন/)).toBeInTheDocument();
  });

  it('ActiveHoldCard: fee button is disabled when hold has expired', () => {
    const expiredHold: ActiveHoldState = {
      holdId: 'h_123',
      classId: 'c_1',
      className: 'Class 6 - Morning Shift',
      studentId: '20051234567890123',
      status: 'EXPIRED',
      expiresAt: new Date(Date.now() - 10000).toISOString(),
    };

    render(
      <ActiveHoldCard
        hold={expiredHold}
        studentId="20051234567890123"
        onHoldUpdated={vi.fn()}
        onRefreshClasses={vi.fn()}
      />
    );

    expect(screen.getByText(/মেয়াদ শেষ \(EXPIRED\)/)).toBeInTheDocument();
    expect(screen.queryByText('ভর্তি ফি প্রদান করুন')).not.toBeInTheDocument();
  });

  it('ClassList: disables button when available seats is 0', () => {
    const classes = [
      {
        id: 'c_full',
        name: 'Class 6 - Day Shift',
        totalSeats: 2,
        heldSeats: 1,
        confirmedSeats: 1,
        availableSeats: 0,
      },
    ];

    render(
      <ClassList
        classes={classes}
        isLoading={false}
        studentId="20051234567890123"
        confirmedClassIds={[]}
        onHoldCreated={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    const fullBtn = screen.getByRole('button', { name: /আসন পূর্ণ/ });
    expect(fullBtn).toBeDisabled();
  });

  it('ClassList: replaces apply button when student already confirmed in that class', () => {
    const classes = [
      {
        id: 'c_confirmed',
        name: 'Class 6 - Morning Shift',
        totalSeats: 10,
        heldSeats: 0,
        confirmedSeats: 1,
        availableSeats: 9,
      },
    ];

    render(
      <ClassList
        classes={classes}
        isLoading={false}
        studentId="20051234567890123"
        confirmedClassIds={['c_confirmed']}
        onHoldCreated={vi.fn()}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText(/আসন ইতিমধ্যে নিশ্চিত করা হয়েছে/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /আবেদন করুন/ })).not.toBeInTheDocument();
  });
});

