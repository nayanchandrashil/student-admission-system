import { useState, FC } from 'react';
import { Users, CheckCircle, Clock, AlertCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { ClassItem, HoldCreatedResponse } from '../types/admission';
import { api } from '../services/api';

interface ClassListProps {
  classes: ClassItem[];
  isLoading: boolean;
  studentId: string;
  confirmedClassIds?: string[];
  onHoldCreated: (hold: HoldCreatedResponse, className: string) => void;
  onRefresh: () => void;
}

export const ClassList: FC<ClassListProps> = ({
  classes,
  isLoading,
  studentId,
  confirmedClassIds = [],
  onHoldCreated,
  onRefresh,
}) => {
  const [applyingClassId, setApplyingClassId] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const isStudentIdValid = /^\d{17}$/.test(studentId);

  const handleApply = async (cls: ClassItem) => {
    if (!isStudentIdValid) {
      setApplyError('আবেদন করার আগে উপরে আপনার ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।');
      return;
    }

    if (cls.availableSeats <= 0) {
      setApplyError('এই ক্লাসে কোনো খালি আসন নেই।');
      return;
    }

    setApplyingClassId(cls.id);
    setApplyError(null);

    try {
      const response = await api.createHold(cls.id, studentId);
      onHoldCreated(response, cls.name);
      onRefresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setApplyError(err.message);
      } else {
        setApplyError('আবেদন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
    } finally {
      setApplyingClassId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
              ২
            </span>
            উপলব্ধ শ্রেণি ও আসন তালিকা
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            আসন সংখ্যা রিয়েলটাইমে স্বয়ংক্রিয়ভাবে প্রতি কয়েক সেকেন্ড পর পর আপডেট হয়।
          </p>
        </div>

        {isLoading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            আপডেট হচ্ছে...
          </span>
        )}
      </div>

      {applyError && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs font-medium text-red-700">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{applyError}</span>
        </div>
      )}

      {classes.length === 0 && !isLoading ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">বর্তমানে কোনো শ্রেণি উন্মুক্ত নেই।</p>
          <p className="text-xs text-slate-400 mt-1">
            অ্যাডমিন প্যানেল থেকে নতুন শ্রেণি যুক্ত করা হলে এখানে প্রদর্শিত হবে।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => {
            const isFull = cls.availableSeats <= 0;
            const isCurrentApplying = applyingClassId === cls.id;

            return (
              <div
                key={cls.id}
                className={`rounded-xl border p-5 flex flex-col justify-between transition-all hover:shadow-md ${
                  isFull ? 'bg-slate-50/60 border-slate-200 opacity-90' : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-slate-800 text-base leading-tight">
                      {cls.name}
                    </h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        isFull
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isFull ? 'পূর্ণ (০ খালি)' : `${cls.availableSeats} টি খালি`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 my-3 text-center">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">মোট আসন</p>
                      <p className="text-sm font-bold text-slate-700">{cls.totalSeats}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 text-blue-500" />
                        হোল্ড
                      </p>
                      <p className="text-sm font-bold text-blue-600">{cls.heldSeats}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-0.5">
                        <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />
                        নিশ্চিত
                      </p>
                      <p className="text-sm font-bold text-emerald-600">{cls.confirmedSeats}</p>
                    </div>
                  </div>
                </div>

                {confirmedClassIds.includes(cls.id) ? (
                  <div className="mt-2 w-full py-2.5 px-4 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    আসন ইতিমধ্যে নিশ্চিত করা হয়েছে
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleApply(cls)}
                    disabled={isFull || !isStudentIdValid || isCurrentApplying}
                    className={`mt-2 w-full py-2.5 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      isFull
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : !isStudentIdValid
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    }`}
                    title={
                      !isStudentIdValid
                        ? 'আবেদন করতে ১৭ অঙ্কের পরিচয় নম্বর দিন'
                        : isFull
                        ? 'কোনো আসন খালি নেই'
                        : 'আসন হোল্ড করতে ক্লিক করুন'
                    }
                  >
                    {isCurrentApplying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        আবেদন করা হচ্ছে...
                      </>
                    ) : isFull ? (
                      'আসন পূর্ণ'
                    ) : (
                      <>
                        আবেদন করুন
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
