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
   * Displays a local test notification to verify push UI functionality.
   */
  async showTestNotification(title = 'YukCatat - Pengingat Harian', body = 'Sudahkah Anda mencatat pengeluaran hari ini?'): Promise<boolean> {
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
