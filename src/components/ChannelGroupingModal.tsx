import React, { useState } from 'react';
import {
  X,
  Radio,
  Plus,
  Trash2,
  Folder,
  Layers,
  Check,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  Sparkles,
  ArrowRightLeft,
} from 'lucide-react';
import { Channel } from '../types';

interface ChannelGroupingModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  currentChannelId: string;
  onSelectChannel: (channelId: string) => void;
  availableGroups: string[];
  onUpdateChannelGroup: (channelId: string, newGroup: string) => void;
  onCreateGroup: (groupName: string) => void;
  onDeleteGroup: (groupName: string) => void;
  onResetDefaults: () => void;
}

export const ChannelGroupingModal: React.FC<ChannelGroupingModalProps> = ({
  isOpen,
  onClose,
  channels,
  currentChannelId,
  onSelectChannel,
  availableGroups,
  onUpdateChannelGroup,
  onCreateGroup,
  onDeleteGroup,
  onResetDefaults,
}) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateNewGroup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    onCreateGroup(trimmed);
    setNewGroupName('');
    setIsCreatingGroup(false);
  };

  const tacticalPresetSuggestions = [
    'Team Alpha',
    'Emergency Services',
    'Tactical Operations',
    'Security & Patrol',
    'SAR Evacuation',
    'Convoy Escort',
  ];

  // Group channels by their group name
  const groupedChannels: Record<string, Channel[]> = {};
  availableGroups.forEach((g) => {
    groupedChannels[g] = [];
  });
  // Also collect any unassigned or channels with custom group
  channels.forEach((ch) => {
    const grp = ch.group || 'General / Unassigned';
    if (!groupedChannels[grp]) {
      groupedChannels[grp] = [];
    }
    groupedChannels[grp].push(ch);
  });

  const getGroupBadgeColor = (groupName: string) => {
    switch (groupName.toLowerCase()) {
      case 'team alpha':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
      case 'emergency services':
      case 'sar evacuation':
        return 'text-rose-400 bg-rose-950/60 border-rose-500/40';
      case 'tactical operations':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40';
      case 'security & patrol':
        return 'text-amber-400 bg-amber-950/60 border-amber-500/40';
      default:
        return 'text-slate-300 bg-slate-900 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-slate-200 font-sans">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-tactical font-black text-sm sm:text-base tracking-wider text-white">
                  CHANNEL PRESETS & GROUPING
                </h2>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-code">
                  MIL-STD-810H
                </span>
              </div>
              <p className="text-xs text-slate-400 font-tactical">
                Organize frequencies into operational presets like Team Alpha or Emergency Services
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Creation & Quick Suggestion Bar */}
        <div className="p-3 bg-slate-950/70 border-b border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
              <span className="text-[11px] text-slate-400 font-tactical font-bold shrink-0">
                PRESETS:
              </span>
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-2.5 py-1 rounded-md font-tactical text-xs transition-all shrink-0 ${
                  activeTab === 'ALL'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                ALL ({channels.length})
              </button>
              {availableGroups.map((group) => {
                const count = channels.filter((c) => (c.group || 'General / Unassigned') === group).length;
                const isCurrent = activeTab === group;
                return (
                  <button
                    key={group}
                    onClick={() => setActiveTab(group)}
                    className={`px-2.5 py-1 rounded-md font-tactical text-xs transition-all shrink-0 flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-emerald-600 text-white font-bold shadow'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{group}</span>
                    <span className="text-[10px] opacity-75 font-code">({count})</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsCreatingGroup(!isCreatingGroup)}
              className="px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80 text-xs font-tactical font-bold flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Preset Group</span>
            </button>
          </div>

          {/* New Preset Creation Form */}
          {isCreatingGroup && (
            <form onSubmit={handleCreateNewGroup} className="mt-3 p-3 bg-slate-900 border border-emerald-500/40 rounded-xl flex flex-col gap-2 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Convoy Escort, Team Charlie, Medevac..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-tactical"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-tactical font-bold text-xs shadow"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingGroup(false)}
                  className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>

              {/* Quick suggestion tags */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-400 font-tactical">Quick suggestions:</span>
                {tacticalPresetSuggestions
                  .filter((s) => !availableGroups.includes(s))
                  .slice(0, 4)
                  .map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        onCreateGroup(sug);
                        setIsCreatingGroup(false);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-tactical"
                    >
                      + {sug}
                    </button>
                  ))}
              </div>
            </form>
          )}
        </div>

        {/* Channel Presets Content View */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[55vh]">
          {(activeTab === 'ALL' ? availableGroups : [activeTab]).map((groupName) => {
            const groupChannelList = channels.filter(
              (c) => (c.group || 'General / Unassigned') === groupName
            );

            return (
              <div
                key={groupName}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm"
              >
                {/* Group Header */}
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded border text-[11px] font-tactical font-black tracking-wide ${getGroupBadgeColor(groupName)}`}>
                      {groupName.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400 font-code">
                      {groupChannelList.length} {groupChannelList.length === 1 ? 'Channel' : 'Channels'}
                    </span>
                  </div>

                  {/* Group Action: Delete (if not protected default) */}
                  {!['Team Alpha', 'Emergency Services'].includes(groupName) && (
                    <button
                      onClick={() => onDeleteGroup(groupName)}
                      className="text-slate-500 hover:text-rose-400 p-1 text-xs flex items-center gap-1 transition-colors"
                      title={`Remove preset group ${groupName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] hidden sm:inline">Delete Preset</span>
                    </button>
                  )}
                </div>

                {/* Channels inside this group */}
                {groupChannelList.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3 text-center italic">
                    No channels currently assigned to {groupName}. Move a channel below to assign it.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupChannelList.map((ch) => {
                      const isActive = ch.id === currentChannelId;
                      const isEditing = editingChannelId === ch.id;

                      return (
                        <div
                          key={ch.id}
                          className={`p-2.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            isActive
                              ? ch.isEmergency
                                ? 'bg-rose-950/40 border-rose-500/70 text-rose-200'
                                : 'bg-emerald-950/40 border-emerald-500/70 text-emerald-200'
                              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isActive
                                  ? ch.isEmergency
                                    ? 'bg-rose-500 animate-ping'
                                    : 'bg-emerald-400 animate-pulse'
                                  : 'bg-slate-600'
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 font-tactical font-bold text-xs sm:text-sm">
                                <span className="truncate">{ch.name}</span>
                                {ch.isEmergency && (
                                  <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-code shrink-0">
                                    SOS
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-code opacity-75 truncate">
                                {ch.frequency} • {ch.description}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {/* Reassign Group Selector / Button */}
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <select
                                  value={ch.group || groupName}
                                  onChange={(e) => {
                                    onUpdateChannelGroup(ch.id, e.target.value);
                                    setEditingChannelId(null);
                                  }}
                                  className="bg-slate-950 border border-emerald-500 rounded px-2 py-1 text-xs text-white font-tactical focus:outline-none"
                                  autoFocus
                                >
                                  {availableGroups.map((g) => (
                                    <option key={g} value={g}>
                                      Move to: {g}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => setEditingChannelId(null)}
                                  className="text-slate-400 hover:text-white text-xs px-1"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingChannelId(ch.id)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-tactical flex items-center gap-1 transition-colors"
                                title="Change channel group preset"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                <span>Move</span>
                              </button>
                            )}

                            {/* Direct Tune / Active button */}
                            {isActive ? (
                              <span className="px-2.5 py-1 rounded text-[11px] font-tactical font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                TUNED
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  onSelectChannel(ch.id);
                                  onClose();
                                }}
                                className="px-2.5 py-1 rounded text-[11px] font-tactical font-bold bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-all shadow-xs flex items-center gap-1"
                              >
                                <Radio className="w-3 h-3" />
                                <span>Tune</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 text-slate-400 hover:text-amber-300 font-tactical transition-colors"
            title="Restore default channel grouping organization"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Mission Presets</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-tactical font-bold shadow transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
