// Browser notification utilities

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export async function showBrowserNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (Notification.permission !== 'granted') return;

  // Mobile requires notifications via Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        ...options,
      });
      return;
    } catch {
      // fall through to direct Notification API
    }
  }

  // Fallback: direct Notification API (desktop browsers without SW)
  const notification = new Notification(title, {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...options,
  });
  setTimeout(() => notification.close(), 5000);
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

// Audio notification using Web Audio API for a pleasant WhatsApp-like chime
let audioContext: AudioContext | null = null;

export function playNotificationSound(): void {
  try {
    // Create or resume AudioContext
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const now = audioContext.currentTime;
    
    // Create a pleasant two-tone chime (like WhatsApp)
    const frequencies = [830, 1046]; // G5 and C6 notes
    const duration = 0.15;
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext!.createOscillator();
      const gainNode = audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext!.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now + index * 0.12);
      
      // Envelope for smooth sound
      gainNode.gain.setValueAtTime(0, now + index * 0.12);
      gainNode.gain.linearRampToValueAtTime(0.3, now + index * 0.12 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.12 + duration);
      
      oscillator.start(now + index * 0.12);
      oscillator.stop(now + index * 0.12 + duration + 0.1);
    });
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

// Check if notifications are supported
export function areNotificationsSupported(): boolean {
  return 'Notification' in window;
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!areNotificationsSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}
