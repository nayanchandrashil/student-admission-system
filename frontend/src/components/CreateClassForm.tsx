import { useState, FC, FormEvent } from 'react';
import { PlusCircle, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface CreateClassFormProps {
  onClassCreated: () => void;
}

export const CreateClassForm: FC<CreateClassFormProps> = ({ onClassCreated }) => {
  const [name, setName] = useState<string>('');
  const [totalSeats, setTotalSeats] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const seatsNum = parseInt(totalSeats, 10);

    if (!trimmedName) {
      setError('শ্রেণির নাম অবশ্যই দিতে হবে।');
      return;
    }

    if (isNaN(seatsNum) || seatsNum <= 0) {
      setError('মোট আসন সংখ্যা অবশ্যই ০ এর চেয়ে বড় পূর্ণসংখ্যা হতে হবে।');
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await api.createClass({
        name: trimmedName,
        totalSeats: seatsNum,
      });

      setSuccess(`"${created.name}" শ্রেণিটি সফলভাবে তৈরি করা হয়েছে (${created.totalSeats} আসন)।`);
      setName('');
      setTotalSeats('');
      onClassCreated();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('শ্রেণি তৈরি করতে সমস্যা হয়েছে।');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-emerald-600" />
          নতুন শ্রেণি যুক্ত করুন (Create Class)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          প্রতিটি শিফটকে একটি আলাদা শ্রেণি হিসেবে যুক্ত করুন (যেমন: "Class 6 - Morning Shift", ১২০ সিট)।
        </p>
      </div>

      {success && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs font-medium text-red-700">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            শ্রেণির নাম ও শিফট <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="যেমন: Class 6 - Morning Shift"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            disabled={isSubmitting}
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            মোট আসন সংখ্যা (Total Seats) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={totalSeats}
            onChange={(e) => setTotalSeats(e.target.value)}
            placeholder="যেমন: 120"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            disabled={isSubmitting}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              সংরক্ষণ করা হচ্ছে...
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              শ্রেণি তৈরি করুন
            </>
          )}
        </button>
      </form>
    </div>
  );
};
