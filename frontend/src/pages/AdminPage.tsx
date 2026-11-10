import { useState, useEffect, useCallback, FC } from 'react';
import { Link } from 'react-router';
import { Shield, ArrowLeft, RefreshCw, Layers, CheckCircle2, Clock } from 'lucide-react';
import { ClassItem } from '../types/admission';
import { api } from '../services/api';
import { CreateClassForm } from '../components/CreateClassForm';

export const AdminPage: FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const data = await api.getClasses();
      setClasses(data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('ক্লাসের তথ্য লোড করা যায়নি।');
      }
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses(true);
  }, [fetchClasses]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold leading-tight">
                অ্যাডমিন ড্যাশবোর্ড (Admin Management)
              </h1>
              <p className="text-[11px] text-slate-400">
                নতুন শ্রেণি তৈরি ও লাইভ আসন পর্যবেক্ষণ
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            শিক্ষার্থী পোর্টালে ফিরুন
          </Link>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <CreateClassForm onClassCreated={() => fetchClasses(false)} />
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between gap-2 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-600" />
                    বিদ্যমান শ্রেণিসমূহ ({classes.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    বর্তমান শ্রেণিগুলোর আসন ও আবেদনের লাইভ পরিসংখ্যান।
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fetchClasses(true)}
                  disabled={isLoading}
                  className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
                  title="রিফ্রেশ করুন"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {error}
                </div>
              )}

              {classes.length === 0 && !isLoading ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                  এখনও কোনো শ্রেণি যুক্ত করা হয়নি। বামপাশের ফর্ম ব্যবহার করে নতুন শ্রেণি যুক্ত করুন।
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                        <th className="pb-3">আইডি</th>
                        <th className="pb-3">শ্রেণির নাম</th>
                        <th className="pb-3 text-center">মোট আসন</th>
                        <th className="pb-3 text-center">হোল্ড</th>
                        <th className="pb-3 text-center">নিশ্চিত</th>
                        <th className="pb-3 text-right">খালি আসন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {classes.map((cls) => (
                        <tr key={cls.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 font-mono text-[11px] text-slate-400">
                            {cls.id}
                          </td>
                          <td className="py-3 font-bold text-slate-800">
                            {cls.name}
                          </td>
                          <td className="py-3 text-center text-slate-700 font-semibold">
                            {cls.totalSeats}
                          </td>
                          <td className="py-3 text-center text-blue-600">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {cls.heldSeats}
                            </span>
                          </td>
                          <td className="py-3 text-center text-emerald-600">
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {cls.confirmedSeats}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${cls.availableSeats <= 0
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-emerald-100 text-emerald-800'
                                }`}
                            >
                              {cls.availableSeats}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
