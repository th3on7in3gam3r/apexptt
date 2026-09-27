/**
 * Offline Status & Outbox Queue Manager for ApexPTT Walkie Talkie
 * Allows voice messages to be recorded and queued while disconnected or in dead zones,
 * and handles offline/online state alerts and automatic synchronization.
 */

import { VoiceMessage, OfflineNotification } from '../types';

const OFFLINE_QUEUE_KEY = 'apex_ptt_offline_queue_v1';
const NOTIFICATIONS_KEY = 'apex_ptt_offline_notifs_v1';

export class OfflineManager {
  private queue: VoiceMessage[] = [];
  private notifications: OfflineNotification[] = [];
  private onOnlineCallback?: () => void;
  private onOfflineCallback?: () => void;
  private onNotificationCallback?: (notif: OfflineNotification) => void;

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private loadFromStorage() {
    try {
      const q = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (q) this.queue = JSON.parse(q);
      const n = localStorage.getItem(NOTIFICATIONS_KEY);
      if (n) this.notifications = JSON.parse(n);
    } catch (e) {
      console.warn('Failed loading offline queue from storage', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(this.notifications.slice(-30)));
    } catch (e) {
      console.warn('Failed saving offline queue to storage', e);
    }
  }

  private handleOnline = () => {
    const notif: OfflineNotification = {
      id: `onl-${Date.now()}`,
      type: 'network_restored',
      title: 'NETWORK LINK RESTORED',
      detail: 'Terminal reconnected to tactical radio network. Ready for transmission.',
      timestamp: Date.now(),
    };
    this.addNotification(notif);
    if (this.onOnlineCallback) this.onOnlineCallback();
  };

  private handleOffline = () => {
    const notif: OfflineNotification = {
      id: `off-${Date.now()}`,
      type: 'network_drop',
      title: 'NETWORK CARRIER LOST (OFFLINE)',
      detail: 'Terminal entered dead zone. Push-to-talk transmissions will be cached locally in Outbox.',
      timestamp: Date.now(),
    };
    this.addNotification(notif);
    if (this.onOfflineCallback) this.onOfflineCallback();
  };

  setCallbacks(callbacks: {
    onOnline?: () => void;
    onOffline?: () => void;
    onNotification?: (notif: OfflineNotification) => void;
  }) {
    this.onOnlineCallback = callbacks.onOnline;
    this.onOfflineCallback = callbacks.onOffline;
    this.onNotificationCallback = callbacks.onNotification;
  }

  addNotification(notif: OfflineNotification) {
    this.notifications.unshift(notif);
    if (this.notifications.length > 50) this.notifications.pop();
    this.saveToStorage();
    if (this.onNotificationCallback) {
      this.onNotificationCallback(notif);
    }
  }

  getNotifications(): OfflineNotification[] {
    return [...this.notifications];
  }

  clearNotifications() {
    this.notifications = [];
    this.saveToStorage();
  }

  enqueueMessage(msg: VoiceMessage) {
    const queuedItem: VoiceMessage = {
      ...msg,
      isOfflineQueued: true,
    };
    this.queue.push(queuedItem);
    this.saveToStorage();

    this.addNotification({
      id: `que-${Date.now()}`,
      type: 'user_offline',
      title: 'TRANSMISSION QUEUED OFFLINE',
      detail: `Voice packet for Channel [${msg.channelId.toUpperCase()}] queued. Will auto-dispatch upon reconnect.`,
      timestamp: Date.now(),
    });
  }

  getQueue(): VoiceMessage[] {
    return [...this.queue];
  }

  removeQueuedMessage(id: string) {
    this.queue = this.queue.filter((m) => m.id !== id);
    this.saveToStorage();
  }

  clearQueue() {
    this.queue = [];
    this.saveToStorage();
  }

  dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }
}

export const offlineManager = new OfflineManager();
