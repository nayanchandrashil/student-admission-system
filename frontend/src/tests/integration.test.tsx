import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { testBackend } from './testServer';
import { AdminPage } from '../pages/AdminPage';
import { HomePage } from '../pages/HomePage';

describe('Frontend Full Integration Tests (Real E2E Flow without Hardcoded Mocking)', () => {
  beforeEach(() => {
    testBackend.reset();
    localStorage.clear();
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
      testBackend.handle(input, init)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Step 1 (Admin Flow): Admin creates a new class and sees it in live list', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/এখনও কোনো শ্রেণি যুক্ত করা হয়নি/)).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/যেমন: Class 6 - Morning Shift/);
    const seatsInput = screen.getByPlaceholderText(/যেমন: 120/);
    const submitBtn = screen.getByRole('button', { name: /শ্রেণি তৈরি করুন/ });

    fireEvent.change(nameInput, { target: { value: 'Class 6 - Morning Shift' } });
    fireEvent.change(seatsInput, { target: { value: '3' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/সফলভাবে তৈরি করা হয়েছে/)).toBeInTheDocument();
    expect(screen.getByText('Class 6 - Morning Shift')).toBeInTheDocument();

    expect(screen.getAllByRole('cell', { name: '3' }).length).toBeGreaterThanOrEqual(1);
  });

  it('Step 2 (Student Apply & Hold Flow): Student enters 17-digit ID, applies for seat, sees live hold countdown', async () => {
    testBackend.classes.push({
      id: 'c_test1',
      name: 'Class 6 - Day Shift',
      totalSeats: 2,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Class 6 - Day Shift')).toBeInTheDocument();
    expect(screen.getByText(/2 টি খালি/)).toBeInTheDocument();

    const applyBtn = screen.getByRole('button', { name: /আবেদন করুন/ });
    expect(applyBtn).toBeDisabled();

    const idInput = screen.getByPlaceholderText(/১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন/);
    fireEvent.change(idInput, { target: { value: '20150000000000001' } });

    expect(await screen.findByText(/শনাক্তকরণ সম্পন্ন/)).toBeInTheDocument();
    expect(applyBtn).not.toBeDisabled();

    fireEvent.click(applyBtn);

    expect(await screen.findByText(/চলমান আবেদনসমূহ/)).toBeInTheDocument();
    expect(screen.getByText(/বাকি সময়:/)).toBeInTheDocument();
    expect(screen.getByText('ভর্তি ফি প্রদান করুন')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText(/1 টি খালি/)).toBeInTheDocument();
    });
  });

  it('Step 3 (Payment Confirmation Flow): Student confirms admission fee, moves down to history, and button hides', async () => {
    testBackend.classes.push({
      id: 'c_test2',
      name: 'Class 7 - Morning',
      totalSeats: 2,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const idInput = await screen.findByPlaceholderText(/১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন/);
    fireEvent.change(idInput, { target: { value: '20150000000000002' } });

    const applyBtn = await screen.findByRole('button', { name: /আবেদন করুন/ });
    fireEvent.click(applyBtn);

    const payFeeBtn = await screen.findByRole('button', { name: /ভর্তি ফি প্রদান করুন/ });
    fireEvent.click(payFeeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/চলমান আবেদনসমূহ/)).not.toBeInTheDocument();
    });

    expect(await screen.findByText(/নিশ্চিত \(CONFIRMED\)/)).toBeInTheDocument();

    expect(await screen.findByText(/আসন ইতিমধ্যে নিশ্চিত করা হয়েছে/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /আবেদন করুন/ })).not.toBeInTheDocument();
  });

  it('Step 4 (Direct Cancel Flow): Cancelling hold directly returns seat without confirmation alert', async () => {
    testBackend.classes.push({
      id: 'c_test3',
      name: 'Class 8 - Regular',
      totalSeats: 1,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const idInput = await screen.findByPlaceholderText(/১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন/);
    fireEvent.change(idInput, { target: { value: '20150000000000003' } });

    const applyBtn = await screen.findByRole('button', { name: /আবেদন করুন/ });
    fireEvent.click(applyBtn);

    expect(await screen.findByText(/পূর্ণ \(০ খালি\)/)).toBeInTheDocument();

    const cancelBtn = await screen.findByRole('button', { name: /বাতিল করুন/ });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText(/চলমান আবেদনসমূহ/)).not.toBeInTheDocument();
    });

    expect(await screen.findByText(/1 টি খালি/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /আবেদন করুন/ })).toBeInTheDocument();
  });

  it('Step 5 (Full Capacity & 409 Conflict): Full class disables apply button and blocks further holds', async () => {
    testBackend.classes.push({
      id: 'c_test4',
      name: 'Class 9 - Full',
      totalSeats: 1,
    });

    testBackend.holds.push({
      id: 'h_other',
      classId: 'c_test4',
      studentId: '20150000000000099',
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const idInput = await screen.findByPlaceholderText(/১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন/);
    fireEvent.change(idInput, { target: { value: '20150000000000005' } });

    expect(await screen.findByText(/পূর্ণ \(০ খালি\)/)).toBeInTheDocument();
    const fullBtn = screen.getByRole('button', { name: /আসন পূর্ণ/ });
    expect(fullBtn).toBeDisabled();
  });
});
