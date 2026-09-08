import React, { useState } from 'react';
import { X, Bell, Clock, Calendar, Check, Send } from 'lucide-react';
import { NotificationConfig } from '../types';
import { pwaService } from '../services/pwa';

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
  const [testSent, setTestSent] = useState(false);

  if (!isOpen) return null;

  const toggleDay = (dayId: number) => {
    if (daysOfWeek.includes(dayId)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== dayId));
    } else {
      setDaysOfWeek([...daysOfWeek, dayId].sort());
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
    setTestSent(true);
    await pwaService.showTestNotification(
      'YukCatat - Pengingat Harian',
      'Saatnya mencatat pengeluaran harian Anda agar arus kas tetap rapi!'
    );
    setTimeout(() => setTestSent(false), 3000);
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
                Jadwalkan notifikasi untuk mencatat buku kas
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
          {/* Toggle Aktifkan */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60">
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200 block">
                Aktifkan Pengingat Harian
              </span>
              <span className="text-xs text-slate-500 dark:text-zinc-400 block">
                Terima pengingat Web Push langsung di perangkat
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isEnabled}
              onClick={() => setIsEnabled(!isEnabled)}
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
                  <span>Waktu Pengingat (Format 24 Jam)</span>
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
                        className={`py-2 text-xs font-bold rounded-lg border transition ${
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
                  disabled={testSent}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold transition"
                >
                  {testSent ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Notifikasi Dikirim ke Browser!</span>
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
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md shadow-blue-500/20 transition"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
