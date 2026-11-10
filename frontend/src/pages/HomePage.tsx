import { useState, useEffect, useCallback, FC } from 'react';
import { Link } from 'react-router';
import { GraduationCap, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { ClassItem, ActiveHoldState, HoldCreatedResponse } from '../types/admission';
import { api } from '../services/api';
import { IdentityBox } from '../components/IdentityBox';
import { ActiveHoldCard } from '../components/ActiveHoldCard';
import { ClassList } from '../components/ClassList';
import { MyApplications } from '../components/MyApplications';

export const HomePage: FC = () => {
  const [studentId, setStudentId] = useState<string>('');
  const [activeHolds, setActiveHolds] = useState<ActiveHoldState[]>([]);
  const [confirmedClassIds, setConfirmedClassIds] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState<boolean>(true);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [myHoldsTrigger, setMyHoldsTrigger] = useState<number>(0);

  // Fetch classes list
  const fetchClasses = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoadingClasses(true);
    try {
      const data = await api.getClasses();
      setClasses(data);
      setClassesError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setClassesError(err.message);
      } else {
        setClassesError('ক্লাসের তথ্য লোড করা যায়নি।');
      }
    } finally {
      if (showLoader) setIsLoadingClasses(false);
    }
  }, []);

  // Fetch active HELD applications for the student from server
  const syncActiveHolds = useCallback(async (id: string) => {
    if (!/^\d{17}$/.test(id)) {
      setActiveHolds([]);
      setConfirmedClassIds([]);
      return;
    }

    try {
      const myHolds = await api.getMyHolds(id);
      const now = Date.now();
      const currentHeld = myHolds
        .filter((h) => h.status === 'HELD' && new Date(h.expiresAt).getTime() > now)
        .map((h) => ({
          holdId: h.holdId,
          classId: h.classId,
          className: h.className,
          studentId: id,
          status: h.status,
          expiresAt: h.expiresAt,
        }));

      setActiveHolds(currentHeld);

      const confirmed = myHolds
        .filter((h) => h.status === 'CONFIRMED')
        .map((h) => h.classId);
      setConfirmedClassIds(confirmed);
    } catch {
    }
  }, []);

  useEffect(() => {
    syncActiveHolds(studentId);
  }, [studentId, syncActiveHolds]);

  useEffect(() => {
    fetchClasses(true);

    const interval = setInterval(() => {
      fetchClasses(false);
    }, 3500);

    return () => clearInterval(interval);
  }, [fetchClasses]);

  // When a new hold is created
  const handleHoldCreated = (hold: HoldCreatedResponse, className: string) => {
    const newHold: ActiveHoldState = {
      holdId: hold.holdId,
      classId: hold.classId,
      className,
      studentId: hold.studentId,
      status: hold.status,
      expiresAt: hold.expiresAt,
    };

    setActiveHolds((prev) => [newHold, ...prev.filter((h) => h.holdId !== newHold.holdId)]);
    setMyHoldsTrigger((prev) => prev + 1);
    fetchClasses(false);
  };

  const handleHoldUpdated = (updated: ActiveHoldState | null) => {
    if (!updated) return;

    if (updated.status === 'CONFIRMED' || updated.status === 'CANCELLED' || updated.status === 'EXPIRED') {
      setActiveHolds((prev) => prev.filter((h) => h.holdId !== updated.holdId));
      if (updated.status === 'CONFIRMED') {
        setConfirmedClassIds((prev) => [...prev, updated.classId]);
      }
    } else {
      setActiveHolds((prev) =>
        prev.map((h) => (h.holdId === updated.holdId ? updated : h))
      );
    }

    setMyHoldsTrigger((prev) => prev + 1);
    fetchClasses(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                অনলাইন ভর্তি আবেদন ব্যবস্থা
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                আগে আসলে আগে পাবেন ভিত্তিতে ভর্তি প্রক্রিয়া (First-Come, First-Served)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors border border-slate-200"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              অ্যাডমিন পোর্টাল
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900">
          <div>
            <span className="font-bold">জরুরি নিয়মাবলী:</span> আবেদন করার পর নির্দিষ্ট সময়ের জন্য আসন সংরক্ষিত (HELD) থাকবে। এই সময়ের মধ্যে ফি প্রদান সম্পন্ন না করলে আসন স্বয়ংক্রিয়ভাবে উন্মুক্ত হয়ে যাবে।
          </div>
          <button
            type="button"
            onClick={() => fetchClasses(true)}
            className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            লাইভ সিঙ্ক
          </button>
        </div>

        {classesError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{classesError}</span>
          </div>
        )}

        <IdentityBox
          studentId={studentId}
          onStudentIdChange={setStudentId}
        />

        {activeHolds.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  !
                </span>
                চলমান আবেদনসমূহ ({activeHolds.length}টি ফি প্রদানের অপেক্ষায়)
              </h2>
              <span className="text-xs text-slate-500 hidden sm:inline">
                নির্দিষ্ট সময়ের মধ্যে ফি প্রদান করে আসন নিশ্চিত করুন
              </span>
            </div>

            <div
              className={`grid gap-4 ${activeHolds.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                }`}
            >
              {activeHolds.map((hold) => (
                <ActiveHoldCard
                  key={hold.holdId}
                  hold={hold}
                  studentId={studentId}
                  onHoldUpdated={handleHoldUpdated}
                  onRefreshClasses={() => fetchClasses(false)}
                />
              ))}
            </div>
          </div>
        )}

        <ClassList
          classes={classes}
          isLoading={isLoadingClasses}
          studentId={studentId}
          confirmedClassIds={confirmedClassIds}
          onHoldCreated={handleHoldCreated}
          onRefresh={() => fetchClasses(false)}
        />

        <MyApplications
          studentId={studentId}
          refreshTrigger={myHoldsTrigger}
        />
      </main>
    </div>
  );
};
