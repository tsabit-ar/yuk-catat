import React, { useState, useEffect } from 'react';
import { X, Bell, Clock, Calendar, Check, Send, AlertCircle } from 'lucide-react';
import { NotificationConfig } from '../types';
import { pwaService } from '../services/pwa';
import { storageService } from '../services/storage';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: NotificationConfig;
  onSaveConfig: (config: NotificationConfig) => void;
}

const DAYS = [
  { id: 1, label: 'Sen' },
  { id: 2, label: 'Sel' },
  { id: 3, label: 'Rab' },
  { id: 4, label: 'Kam' },
  { id: 5, label: 'Jum' },
  { id: 6, label: 'Sab' },
  { id: 7, label: 'Min' },
];

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [isEnabled, setIsEnabled] = useState(config.isEnabled);
  const [reminderTime, setReminderTime] = useState(config.reminderTime);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(config.daysOfWeek);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Sync with prop when opened
  useEffect(() => {
    if (isOpen) {
      setIsEnabled(config.isEnabled);
      setReminderTime(config.reminderTime);
      setDaysOfWeek(config.daysOfWeek);
      setTestStatus(null);
      setFeedback(null);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const toggleDay = (dayId: number) => {
    if (daysOfWeek.includes(dayId)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== dayId));
    } else {
      setDaysOfWeek([...daysOfWeek, dayId].sort());
    }
  };

  const handleToggleEnable = async () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);

    if (nextState) {
      // Prompt browser permission & subscribe to Web Push on backend
      setIsSubscribing(true);
      try {
        const success = await pwaService.subscribeToWebPush();
        if (success) {
          setFeedback('Perangkat browser Anda berhasil terdaftar untuk Web Push harian!');
        } else {
          setFeedback('Izin notifikasi browser belum diberikan atau push belum aktif.');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSubscribing(false);
      }
    }
  };

  const handleSave = () => {
    onSaveConfig({
      isEnabled,
      reminderTime,
      daysOfWeek,
    });
    onClose();
  };

  const handleTestNotification = async () => {
    setTestStatus('sending');
    try {
      // First attempt test push via backend API
      const result = await storageService.testPush();
      setTestStatus(`Terkirim dari server (${result.sentCount} perangkat)!`);
    } catch {
      // Graceful fallback to local browser notification if backend push is not registered
      const localOk = await pwaService.showTestNotification(
        'YukCatat - Uji Coba Pengingat',
        'Notifikasi uji coba berhasil ditampilkan di peramban Anda!'
      );
      if (localOk) {
        setTestStatus('Notifikasi lokal browser aktif!');
      } else {
        setTestStatus('Gagal: Izin notifikasi browser belum aktif.');
      }
    }

    setTimeout(() => setTestStatus(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Pengingat Harian PWA
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Tersinkronisasi dengan cron worker server backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {feedback && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Toggle Aktifkan */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60">
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200 block">
                Aktifkan Pengingat Harian
              </span>
              <span className="text-xs text-slate-500 dark:text-zinc-400 block">
                {isSubscribing
                  ? 'Mendaftarkan endpoint Web Push...'
                  : 'Kirim notifikasi terjadwal dari server'}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isEnabled}
              onClick={handleToggleEnable}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {isEnabled && (
            <>
              {/* Waktu Pengingat (24h Time Picker) */}
              <div>
                <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2">
                  <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Waktu Pengingat (WIB / Asia Jakarta, Format 24 Jam)</span>
                </label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full text-sm font-medium px-3.5 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Pilihan Hari dalam Seminggu */}
              <div>
                <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Hari Aktif Pengingat</span>
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS.map((day) => {
                    const isSelected = daysOfWeek.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDay(day.id)}
                        className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Uji Coba Web Push Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testStatus === 'sending'}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold transition cursor-pointer"
                >
                  {testStatus ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{testStatus}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Uji Coba Notifikasi Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
