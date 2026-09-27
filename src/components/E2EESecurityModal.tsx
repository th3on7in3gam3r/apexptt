import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Key, CheckCircle, Lock, RefreshCw, X, Copy, Check } from 'lucide-react';
import { computeSafetyFingerprint } from '../utils/cryptoEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  e2eeEnabled: boolean;
  passphrase: string;
  onUpdate: (enabled: boolean, newPassphrase: string) => void;
}

export const E2EESecurityModal: React.FC<Props> = ({
  isOpen,
  onClose,
  e2eeEnabled,
  passphrase,
  onUpdate,
}) => {
  const [enabled, setEnabled] = useState(e2eeEnabled);
  const [keyInput, setKeyInput] = useState(passphrase);
  const [fingerprint, setFingerprint] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEnabled(e2eeEnabled);
    setKeyInput(passphrase);
  }, [e2eeEnabled, passphrase, isOpen]);

  useEffect(() => {
    computeSafetyFingerprint(keyInput).then(setFingerprint);
  }, [keyInput]);

  if (!isOpen) return null;

  const handleGenerateKey = () => {
    const words = ['APEX', 'VANGUARD', 'SENTINEL', 'FALCON', 'SPECTRE', 'ECHO', 'VALKYRIE'];
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
    const newKey = `${randomWord}-${randomHex}`;
    setKeyInput(newKey);
  };

  const handleSave = () => {
    onUpdate(enabled, keyInput.trim());
    onClose();
  };

  const handleCopyFingerprint = () => {
    navigator.clipboard.writeText(fingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-xl max-w-lg w-full p-6 shadow-2xl relative text-slate-200 font-sans">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className={`p-2.5 rounded-lg border ${enabled ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-tactical font-bold tracking-wider text-white">
              END-TO-END SECURITY ENCRYPTION
            </h2>
            <p className="text-xs text-slate-400">Military-grade AES-256-GCM zero-knowledge voice encryption</p>
          </div>
        </div>

        {/* E2EE Enable Toggle */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 mb-5 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm flex items-center gap-2 text-white">
              <Lock className="w-4 h-4 text-emerald-400" />
              AES-256-GCM Cryptographic Channel Lock
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Encrypt all voice payloads locally before transmission over WebSocket
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Passphrase / Key Config */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-tactical uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Channel Passphrase / Pre-Shared Key (PSK)</span>
              <button
                type="button"
                onClick={handleGenerateKey}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-sans"
              >
                <RefreshCw className="w-3 h-3" /> Generate Key
              </button>
            </label>
            <div className="relative">
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter tactical encryption key..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg py-2.5 px-3.5 text-sm font-code text-emerald-300 focus:outline-none tracking-wider"
              />
              <Key className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              All team members in this group channel must share the identical key to decrypt transmissions.
            </p>
          </div>

          {/* Safety Verification Number */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-tactical tracking-wider text-slate-300">CRYPTOGRAPHIC SAFETY CODE</span>
              <button
                onClick={handleCopyFingerprint}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="font-code text-sm font-bold tracking-widest text-emerald-400 bg-black/40 py-2 px-3 rounded border border-emerald-950 text-center select-all">
              {fingerprint || 'CALCULATING...'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Compare this safety fingerprint with team members over the radio to verify authentic end-to-end security and confirm zero interception.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 flex items-center gap-2 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Apply Encryption
          </button>
        </div>
      </div>
    </div>
  );
};
