import { useState, useEffect, FC } from 'react';
import { FileText, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, AlertOctagon } from 'lucide-react';
import { MyHoldItem } from '../types/admission';
import { api } from '../services/api';

interface MyApplicationsProps {
  studentId: string;
  refreshTrigger: number;
}

export const MyApplications: FC<MyApplicationsProps> = ({
  studentId,
  refreshTrigger,
}) => {
  const [applications, setApplications] = useState<MyHoldItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isValidStudentId = /^\d{17}$/.test(studentId);

  const fetchMyHolds = async () => {
    if (!isValidStudentId) {
      setApplications([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getMyHolds(studentId);
      setApplications(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('আবেদনের তালিকা লোড করা যায়নি।');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyHolds();
  }, [studentId, refreshTrigger]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            নিশ্চিত (CONFIRMED)
          </span>
        );
      case 'HELD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <Clock className="w-3.5 h-3.5" />
            হোল্ড (HELD)
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <AlertOctagon className="w-3.5 h-3.5" />
            মেয়াদোত্তীর্ণ (EXPIRED)
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <XCircle className="w-3.5 h-3.5" />
            বাতিল (CANCELLED)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('bn-BD', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between gap-2 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
              ৩
            </span>
            আমার পূর্ববর্তী আবেদনসমূহ
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            আপনার ১৭ অঙ্কের নম্বরে রেজিস্টার করা সব আবেদনের ইতিহাস।
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMyHolds}
          disabled={isLoading || !isValidStudentId}
          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
          title="রিফ্রেশ করুন"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {!isValidStudentId ? (
        <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs">
          আবেদনের ইতিহাস দেখতে উপরে সঠিক ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।
        </div>
      ) : applications.length === 0 && !isLoading ? (
        <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs">
          <FileText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
          এই জন্ম নিবন্ধন নম্বরে এখনও কোনো আবেদন করা হয়নি।
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-medium">
                <th className="pb-3 font-semibold">আবেদন আইডি (Hold ID)</th>
                <th className="pb-3 font-semibold">শ্রেণি (Class)</th>
                <th className="pb-3 font-semibold">মেয়াদ / সময়</th>
                <th className="pb-3 font-semibold text-right">বর্তমান অবস্থা</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((app) => (
                <tr key={app.holdId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 font-mono text-slate-600 font-medium">
                    {app.holdId}
                  </td>
                  <td className="py-3 font-semibold text-slate-800">
                    {app.className}
                  </td>
                  <td className="py-3 text-slate-500">
                    {formatDate(app.expiresAt)}
                  </td>
                  <td className="py-3 text-right">
                    {renderStatusBadge(app.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
