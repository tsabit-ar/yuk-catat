import { storageService } from './storage';

/**
 * Converts a base64 string to a Uint8Array buffer for PushManager applicationServerKey.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Service worker and PWA Web Push notification utility.
 */
export const pwaService = {
  /**
   * Registers the service worker located at /sw.js.
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        console.log('[PWA] Service Worker registered successfully with scope:', registration.scope);
        return registration;
      } catch (error) {
        console.warn('[PWA] Service Worker registration failed:', error);
        return null;
      }
    }
    return null;
  },

  /**
   * Requests browser notification permission.
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[PWA] Notifications not supported in this browser.');
      return 'denied';
    }
    const permission = await Notification.requestPermission();
    return permission;
  },

  /**
   * Subscribes the current browser to Web Push using the backend's VAPID public key
   * and persists the subscription to the backend database.
   */
  async subscribeToWebPush(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[PWA] PushManager tidak didukung di browser ini.');
      return false;
    }

    const permission = await this.requestNotificationPermission();
    if (permission !== 'granted') {
      return false;
    }

    try {
      const reg = await navigator.serviceWorker.ready;

      // Fetch VAPID public key from environment or backend
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || (await storageService.getVapidPublicKey());
      if (!vapidPublicKey) {
        console.warn('[PWA] VAPID Public Key belum tersedia.');
        return false;
      }

      // Check existing subscription
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
        });
      }

      // Send subscription to backend
      await storageService.subscribePush(sub);
      console.log('[PWA] Browser berhasil terhubung ke server push.');
      return true;
    } catch (err) {
      console.error('[PWA] Gagal subscribe web push:', err);
      return false;
    }
  },

  /**
   * Displays a local test notification to verify push UI functionality.
   */
  async showTestNotification(
    title = 'YukCatat - Pengingat Harian',
    body = 'Sudahkah Anda mencatat pengeluaran hari ini?'
  ): Promise<boolean> {
    if (!('Notification' in window)) return false;

    if (Notification.permission !== 'granted') {
      const permission = await this.requestNotificationPermission();
      if (permission !== 'granted') return false;
    }

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag: 'daily-reminder',
          });
          return true;
        }
      }
      // Fallback
      new Notification(title, {
        body,
        icon: '/favicon.svg',
      });
      return true;
    } catch (e) {
      console.error('[PWA] Error showing notification:', e);
      return false;
    }
  },
};
