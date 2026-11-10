import { useState, useEffect, FC, ChangeEvent } from 'react';
import { UserCheck, AlertCircle, Trash2 } from 'lucide-react';

interface IdentityBoxProps {
  studentId: string;
  onStudentIdChange: (newId: string) => void;
}

const STORAGE_KEY = 'school_student_id';

export const IdentityBox: FC<IdentityBoxProps> = ({
  studentId,
  onStudentIdChange,
}) => {
  const [inputValue, setInputValue] = useState(studentId);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || '';
    if (saved) {
      setInputValue(saved);
      onStudentIdChange(saved);
    }
  }, []);

  useEffect(() => {
    setInputValue(studentId);
  }, [studentId]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Only allow digits up to 17 chars
    const val = e.target.value.replace(/\D/g, '').slice(0, 17);
    setInputValue(val);
    onStudentIdChange(val);
    localStorage.setItem(STORAGE_KEY, val);
  };

  const handleClear = () => {
    setInputValue('');
    onStudentIdChange('');
    localStorage.removeItem(STORAGE_KEY);
  };

  const isValid = /^\d{17}$/.test(inputValue);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
              ১
            </span>
            শিক্ষার্থীর পরিচয় (জন্ম নিবন্ধন নম্বর)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            আবেদন ও ফি প্রদানের জন্য আপনার ১৭ অঙ্কের অনলাইন জন্ম নিবন্ধন নম্বর প্রবেশ করান।
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isValid ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <UserCheck className="w-3.5 h-3.5" />
              শনাক্তকরণ সম্পন্ন
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
              {inputValue.length === 0 ? 'নম্বর লিখুন' : `${17 - inputValue.length} সংখ্যা বাকি`}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleChange}
            placeholder="১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন (যেমন: 20051234567890123)"
            className={`w-full px-4 py-2.5 rounded-lg border text-sm font-mono tracking-wider transition-colors focus:outline-none focus:ring-2 ${
              isValid
                ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-200 bg-emerald-50/20'
                : inputValue.length > 0
                ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-200'
                : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
            }`}
          />
        </div>

        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            title="নম্বর মুছুন"
            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {!isValid && inputValue.length > 0 && (
        <p className="text-xs text-amber-600 mt-2 font-medium">
          সঠিক ১৭ অঙ্কের নম্বর দিন (বর্তমানে {inputValue.length} অঙ্ক দেওয়া হয়েছে)।
        </p>
      )}
    </div>
  );
};
