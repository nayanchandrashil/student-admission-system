import { useState, useEffect, useRef, FC } from 'react';
import { Clock, CheckCircle2, AlertOctagon, XCircle, CreditCard, Ban } from 'lucide-react';
import { ActiveHoldState } from '../types/admission';
import { api } from '../services/api';

interface ActiveHoldCardProps {
  hold: ActiveHoldState | null;
  studentId: string;
  onHoldUpdated: (updatedHold: ActiveHoldState | null) => void;
  onRefreshClasses: () => void;
}

export const ActiveHoldCard: FC<ActiveHoldCardProps> = ({
  hold,
  studentId,
  onHoldUpdated,
  onRefreshClasses,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const syncedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!hold) {
      setRemainingSeconds(0);
      syncedRef.current = false;
      return;
    }

    const calculateRemaining = () => {
      const expiry = new Date(hold.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      return diff;
    };

    setRemainingSeconds(calculateRemaining());

    if (hold.status !== 'HELD') {
      return;
    }

    const timer = setInterval(() => {
      const left = calculateRemaining();
      setRemainingSeconds(left);

      if (left <= 0) {
        clearInterval(timer);
        if (!syncedRef.current && hold.status === 'HELD') {
          syncedRef.current = true;
          onHoldUpdated({
            ...hold,
            status: 'EXPIRED',
          });

          api.getHold(hold.holdId)
            .then((res) => {
              onHoldUpdated({
                ...hold,
                status: res.status,
              });
              onRefreshClasses();
            })
            .catch(() => {
            });
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [hold?.holdId, hold?.expiresAt, hold?.status]);

  if (!hold) return null;

  const isExpired = hold.status === 'EXPIRED' || (hold.status === 'HELD' && remainingSeconds <= 0);
  const isHeld = hold.status === 'HELD' && !isExpired;
  const isConfirmed = hold.status === 'CONFIRMED';
  const isCancelled = hold.status === 'CANCELLED';

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePayFee = async () => {
    if (!isHeld || isExpired) return;
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const result = await api.confirmHold(hold.holdId, studentId);
      const updated: ActiveHoldState = {
        ...hold,
        status: result.status,
      };
      onHoldUpdated(updated);
      setActionSuccess('ভর্তি ফি সফলভাবে প্রদান করা হয়েছে এবং আসনটি নিশ্চিত হয়েছে!');
      onRefreshClasses();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('ফি প্রদান ব্যর্থ হয়েছে।');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (isConfirmed) return;

    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await api.cancelHold(hold.holdId, studentId);
      const updated: ActiveHoldState = {
        ...hold,
        status: 'CANCELLED',
      };
      onHoldUpdated(updated);
      setActionSuccess('আবেদনটি বাতিল করা হয়েছে। আসনটি ফেরত দেওয়া হয়েছে।');
      onRefreshClasses();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('আবেদন বাতিল করা সম্ভব হয়নি।');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    onHoldUpdated(null);
  };

  return (
    <div className={`rounded-xl shadow-md border p-6 transition-all ${isConfirmed
        ? 'bg-emerald-50/50 border-emerald-200'
        : isExpired
          ? 'bg-red-50/50 border-red-200'
          : isCancelled
            ? 'bg-slate-50 border-slate-200'
            : 'bg-blue-50/50 border-blue-200'
      }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              বর্তমান আবেদন
            </span>
            <span className="text-[11px] font-mono text-slate-400 truncate max-w-[140px]" title={hold.holdId}>
              {hold.holdId}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 truncate">
            {hold.className || 'ক্লাস আবেদন'}
          </h3>
        </div>

        <div className="shrink-0">
          {isHeld && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-800 font-medium text-xs sm:text-sm border border-blue-200 whitespace-nowrap shadow-xs">
              <Clock className="w-3.5 h-3.5 animate-pulse text-blue-600 shrink-0" />
              <span className="text-xs">বাকি সময়:</span>
              <span className="font-mono text-xs sm:text-sm font-bold text-blue-900">
                {formatTime(remainingSeconds)}
              </span>
            </div>
          )}

          {isConfirmed && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-semibold text-sm border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              আসন নিশ্চিত (CONFIRMED)
            </span>
          )}

          {isExpired && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-100 text-red-800 font-semibold text-sm border border-red-200">
              <AlertOctagon className="w-4 h-4 text-red-600" />
              মেয়াদ শেষ (EXPIRED)
            </span>
          )}

          {isCancelled && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-semibold text-sm">
              <XCircle className="w-4 h-4 text-slate-500" />
              বাতিলকৃত (CANCELLED)
            </span>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="mt-4 p-3 bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-medium text-emerald-800">
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-xs font-medium text-red-800">
          {actionError}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {isHeld && 'সময় শেষ হওয়ার আগেই "ভর্তি ফি প্রদান করুন" বাটনে চাপ দিয়ে ভর্তি নিশ্চিত করুন।'}
          {isConfirmed && 'আপনার আসন সফলভাবে সংরক্ষিত হয়েছে। অভিনন্দন!'}
          {isExpired && 'সময় শেষ হয়ে যাওয়ায় এই আসনটি মুক্ত হয়ে গেছে। আপনি প্রয়োজনে পুনরায় আবেদন করতে পারেন।'}
          {isCancelled && 'আপনি আবেদনটি বাতিল করেছেন।'}
        </p>

        <div className="flex items-center gap-2">
          {isHeld && (
            <>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5 text-slate-500" />
                বাতিল করুন
              </button>

              <button
                type="button"
                onClick={handlePayFee}
                disabled={isProcessing || isExpired}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-4 h-4" />
                {isProcessing ? 'প্রক্রিয়াধীন...' : 'ভর্তি ফি প্রদান করুন'}
              </button>
            </>
          )}

          {(isExpired || isCancelled || isConfirmed) && (
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            >
              বন্ধ করুন
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
