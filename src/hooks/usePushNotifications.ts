import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 
                      'PushManager' in window && 
                      'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  // Check if already subscribed
  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('[Push] Error checking subscription:', error);
    }
  };

  // Request permission and subscribe
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast.error('Notificações push não são suportadas neste navegador');
      return false;
    }

    setIsLoading(true);
    
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission !== 'granted') {
        toast.error('Permissão para notificações negada');
        return false;
      }

      // Chave pública VAPID (pública por definição — pode ficar no frontend)
      const VAPID_PUBLIC_KEY = 'BDs_ZMBSsde5Wbu2-sI_vDzEvrdIXWdlZdhrSrrzXuoFlf9IBW5wT-x8_ZOSt0ZwLKJHRNX0-Ql4rTU4zlzy_e0';
      const vapidPublicKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      // Subscribe to push
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      });

      // Save subscription to backend
      const { error: subError } = await supabase.functions.invoke('send-push', {
        body: {
          action: 'subscribe',
          subscription: subscription.toJSON(),
          deviceInfo: navigator.userAgent
        }
      });

      if (subError) {
        throw subError;
      }

      setIsSubscribed(true);
      toast.success('Notificações push ativadas!');
      return true;
    } catch (error) {
      console.error('[Push] Subscribe error:', error);
      toast.error('Erro ao ativar notificações push');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Unsubscribe
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      
      if (subscription) {
        // Remove from backend
        await supabase.functions.invoke('send-push', {
          body: {
            action: 'unsubscribe',
            endpoint: subscription.endpoint
          }
        });

        // Unsubscribe locally
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      toast.success('Notificações push desativadas');
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
      toast.error('Erro ao desativar notificações');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle subscription
  const toggleSubscription = useCallback(async () => {
    if (isSubscribed) {
      return unsubscribe();
    } else {
      return subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    toggleSubscription
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}
