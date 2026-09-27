import React, { useEffect, useState } from 'react';
import { AlertTriangle, Volume2, X } from 'lucide-react';
import { ConnectionStatus } from '../types';
import { unlockAudio } from '../utils/audioEngine';

const DISMISS_KEY = 'apex_ptt_receive_watch_dismissed_v1';

interface Props {
  connectionStatus: ConnectionStatus;
  isMuted: boolean;
}

export const ReceiveWatchBanner: React.FC<Props> = ({ connectionStatus, isMuted }) => {
  const [hintDismissed, setHintDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [wasOffAir, setWasOffAir] = useState(false);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setWasOffAir(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onVisibility);
    };
  }, []);

  const dismissHint = () => {
    setHintDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const resumeReceive = () => {
    void unlockAudio();
    setWasOffAir(false);
    dismissHint();
  };

  if (wasOffAir) {
    return (
      <div className="sticky top-14 sm:top-16 z-30 border-b-2 border-rose-400 bg-rose-600 text-white shadow-[0_8px_24px_rgba(225,29,72,0.45)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
          <div className="min-w-0 flex-1">
            <div className="font-tactical font-black tracking-widest text-sm">RADIO WAS OFF AIR</div>
            <p className="text-[12px] leading-snug mt-0.5 font-medium">
              Screen locked or this tab left. Incoming voice was missed. Tap Resume, keep the phone unlocked, and stay on this page.
            </p>
          </div>
          <button
            type="button"
            onClick={resumeReceive}
            className="shrink-0 px-3 py-2 rounded-lg bg-white text-rose-700 font-tactical font-black text-xs tracking-wider"
          >
            RESUME
          </button>
        </div>
      </div>
    );
  }

  if (hintDismissed && !isMuted && connectionStatus === 'connected') {
    return null;
  }

  return (
    <div className="sticky top-14 sm:top-16 z-30 border-b-2 border-amber-300 bg-amber-400 text-black shadow-[0_8px_24px_rgba(251,191,36,0.4)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-start gap-3">
        <Volume2 className="w-5 h-5 shrink-0 mt-0.5" />
        <button type="button" onClick={() => void unlockAudio()} className="min-w-0 flex-1 text-left">
          <div className="font-tactical font-black tracking-widest text-sm">
            {isMuted ? 'SPEAKER MUTED' : connectionStatus !== 'connected' ? 'RADIO NOT CONNECTED' : 'KEEP THIS TAB OPEN'}
          </div>
          <p className="text-[12px] leading-snug mt-0.5 font-semibold">
            {isMuted
              ? 'Unmute to hear incoming traffic. A locked phone or another app still cannot receive.'
              : 'Locked phone, another app, or a hidden tab = you will not hear voice. Tap once to enable the speaker, then leave ApexPTT on screen.'}
          </p>
        </button>
        <button
          type="button"
          onClick={dismissHint}
          className="shrink-0 p-1.5 rounded-md hover:bg-black/10"
          aria-label="Dismiss receive warning"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
