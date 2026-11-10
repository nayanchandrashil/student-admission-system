import { API_BASE_URL } from '../config';
import {
  ClassItem,
  CreateClassRequest,
  CreateClassResponse,
  HoldCreatedResponse,
  HoldStatusResponse,
  HoldConfirmedResponse,
  MyHoldItem,
} from '../types/admission';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function parseBanglaErrorMessage(status: number, serverMessage?: string): string {
  if (status === 400) {
    if (serverMessage?.toLowerCase().includes('17 digits')) {
      return '১৭ অঙ্কের সঠিক জন্ম নিবন্ধন নম্বর দিন।';
    }
    if (serverMessage?.toLowerCase().includes('name is required')) {
      return 'ক্লাসের নাম আবশ্যক।';
    }
    if (serverMessage?.toLowerCase().includes('totalseats')) {
      return 'মোট আসন সংখ্যা ০ এর বেশি হতে হবে।';
    }
    return serverMessage || 'অনুরোধটি সঠিক নয়। অনুগ্রহ করে তথ্য যাচাই করুন।';
  }

  if (status === 403) {
    return 'এই আবেদনটি অন্য শিক্ষার্থীর। আপনি এটি পরিবর্তন করতে পারবেন না।';
  }

  if (status === 404) {
    return 'নির্দিষ্ট ক্লাস বা আবেদনটি পাওয়া যায়নি।';
  }

  if (status === 409) {
    if (serverMessage?.toLowerCase().includes('already')) {
      return 'আপনি ইতিমধ্যে এই ক্লাসে আবেদন করেছেন।';
    }
    if (serverMessage?.toLowerCase().includes('expired') || serverMessage?.toLowerCase().includes('cancel')) {
      return 'আপনার আবেদনের মেয়াদ শেষ হয়ে গেছে বা আবেদনটি বাতিল হয়েছে।';
    }
    if (serverMessage?.toLowerCase().includes('confirmed')) {
      return 'নিশ্চিত করা আবেদন বাতিল করা যায় না।';
    }
    return 'seat শেষ হয়ে গেছে অথবা আবেদন প্রক্রিয়ায় সমস্যা হয়েছে।';
  }

  if (status >= 500) {
    return 'সার্ভারে অভ্যন্তরীণ সমস্যা দেখা দিয়েছে। একটু পর আবার চেষ্টা করুন।';
  }

  return serverMessage || 'অপ্রত্যাশিত কোনো সমস্যা ঘটেছে।';
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  studentId?: string
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (studentId) {
    headers.set('X-Student-Id', studentId.trim());
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError('সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। অনুগ্রহ করে নেটওয়ার্ক ও ব্যাকএন্ড সংযোগ চেক করুন।', 0);
  }

  if (!response.ok) {
    let serverMessage = '';
    try {
      const data = await response.json();
      serverMessage = data?.message || '';
    } catch {
      // Non-JSON error body
    }
    const message = parseBanglaErrorMessage(response.status, serverMessage);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}

export const api = {
  // API #1: POST /classes
  createClass: (payload: CreateClassRequest): Promise<CreateClassResponse> =>
    request<CreateClassResponse>('/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getClasses: (): Promise<ClassItem[]> =>
    request<ClassItem[]>('/classes', { method: 'GET' }),

  getClassById: (classId: string): Promise<ClassItem> =>
    request<ClassItem>(`/classes/${encodeURIComponent(classId)}`, { method: 'GET' }),

  createHold: (classId: string, studentId: string): Promise<HoldCreatedResponse> =>
    request<HoldCreatedResponse>(
      `/classes/${encodeURIComponent(classId)}/holds`,
      { method: 'POST' },
      studentId
    ),

  getHold: (holdId: string): Promise<HoldStatusResponse> =>
    request<HoldStatusResponse>(`/holds/${encodeURIComponent(holdId)}`, { method: 'GET' }),

  confirmHold: (holdId: string, studentId: string): Promise<HoldConfirmedResponse> =>
    request<HoldConfirmedResponse>(
      `/holds/${encodeURIComponent(holdId)}/confirm`,
      { method: 'POST' },
      studentId
    ),

  cancelHold: (holdId: string, studentId: string): Promise<void> =>
    request<void>(
      `/holds/${encodeURIComponent(holdId)}`,
      { method: 'DELETE' },
      studentId
    ),

  getMyHolds: (studentId: string): Promise<MyHoldItem[]> =>
    request<MyHoldItem[]>('/me/holds', { method: 'GET' }, studentId),
};

