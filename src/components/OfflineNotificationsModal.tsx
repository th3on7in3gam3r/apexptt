import React from 'react';
import { Wifi, WifiOff, Bell, Clock, Radio, CheckCircle2, Trash2, X, RefreshCw } from 'lucide-react';
import { OfflineNotification, VoiceMessage } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notifications: OfflineNotification[];
  queuedMessages: VoiceMessage[];
  onClearNotifications: () => void;
  onSyncQueuedNow?: () => void;
}

export const OfflineNotificationsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  notifications,
  queuedMessages,
  onClearNotifications,
  onSyncQueuedNow,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl relative text-slate-200 font-sans">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-lg border bg-amber-950/60 border-amber-500/40 text-amber-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-tactical font-bold tracking-wider text-white">
              OFFLINE STATUS & NETWORK ALERTS
            </h2>
            <p className="text-xs text-slate-400">
              Terminal connectivity log & offline cached voice dispatches
            </p>
          </div>
        </div>

        {/* Offline Queued Messages Banner */}
        {queuedMessages.length > 0 && (
          <div className="mb-5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-amber-300 font-tactical">
                  {queuedMessages.length} VOICE MESSAGE{queuedMessages.length > 1 ? 'S' : ''} QUEUED FOR SYNC
                </div>
                <div className="text-[11px] text-slate-400">
                  Recorded during signal drop. Auto-sync will dispatch when reconnected.
                </div>
              </div>
            </div>
            {onSyncQueuedNow && (
              <button
                onClick={onSyncQueuedNow}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs rounded-lg flex items-center gap-1.5 transition-colors font-tactical font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sync Now
              </button>
            )}
          </div>
        )}

        {/* Notification History List */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 mb-5">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
              <span>All systems nominal. No connection drops or peer offline alerts recorded.</span>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-lg border text-xs flex items-start gap-3 ${
                  notif.type === 'network_drop' || notif.type === 'user_offline'
                    ? 'bg-rose-950/30 border-rose-800/40 text-rose-200'
                    : notif.type === 'network_restored' || notif.type === 'user_online'
                    ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="mt-0.5">
                  {notif.type === 'network_drop' ? (
                    <WifiOff className="w-4 h-4 text-rose-400" />
                  ) : notif.type === 'network_restored' ? (
                    <Wifi className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Radio className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-tactical font-bold tracking-wider flex items-center justify-between">
                    <span>{notif.title}</span>
                    <span className="text-[10px] opacity-60 font-code flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-[11px] mt-0.5 opacity-90 leading-relaxed font-sans">
                    {notif.detail}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <button
            onClick={onClearNotifications}
            disabled={notifications.length === 0}
            className="text-slate-400 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-slate-400 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Log History
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
