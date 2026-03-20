import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, AlertTriangle, Clock, CreditCard, ListTodo, Volume2, VolumeX, BellRing, Loader2, UserRoundSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useCheckNotifications,
  Notification,
  NotificationType,
} from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  showBrowserNotification,
  playNotificationSound,
} from '@/lib/notifications';

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'task_due_soon':
      return <Clock className="h-4 w-4 text-warning" />;
    case 'task_overdue':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'payment_due_soon':
      return <CreditCard className="h-4 w-4 text-warning" />;
    case 'payment_overdue':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'lead_reminder':
      return <UserRoundSearch className="h-4 w-4 text-primary" />;
    default:
      return <ListTodo className="h-4 w-4" />;
  }
}

function getNotificationColor(type: NotificationType) {
  switch (type) {
    case 'task_overdue':
    case 'payment_overdue':
      return 'bg-destructive/10 border-destructive/20';
    case 'task_due_soon':
    case 'payment_due_soon':
      return 'bg-warning/10 border-warning/20';
    case 'lead_reminder':
      return 'bg-primary/10 border-primary/20';
    default:
      return 'bg-muted';
  }
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onClick: (notification: Notification) => void;
}

function NotificationItem({ notification, onMarkRead, onClick }: NotificationItemProps) {
  return (
    <div
      className={cn(
        'p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors',
        !notification.is_read && getNotificationColor(notification.type)
      )}
      onClick={() => onClick(notification)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              'text-sm truncate',
              !notification.is_read && 'font-medium'
            )}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(notification.id);
                }}
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const { data: unreadCount } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const checkNotifications = useCheckNotifications();
  
  // Web Push notifications hook
  const { 
    isSupported: isPushSupported, 
    isSubscribed: isPushSubscribed, 
    isLoading: isPushLoading,
    toggleSubscription 
  } = usePushNotifications();
  
  // Track previous unread count to detect new notifications
  const prevUnreadCountRef = useRef<number | undefined>(undefined);
  
  // Settings state - sound only
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('notification-sound');
    return saved !== 'false';
  });

  // Handle sound toggle
  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem('notification-sound', String(enabled));
    if (enabled) {
      playNotificationSound();
    }
  };

  // Check for new notifications on mount and periodically
  useEffect(() => {
    checkNotifications.mutate();
    const interval = setInterval(() => {
      checkNotifications.mutate();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  // Detect new notifications and alert user
  useEffect(() => {
    if (unreadCount === undefined) return;
    
    const prevCount = prevUnreadCountRef.current;
    
    // Only trigger if we have more unread than before (new notification arrived)
    if (prevCount !== undefined && unreadCount > prevCount) {
      // Play sound if enabled
      if (soundEnabled) {
        playNotificationSound();
      }
      
      // Show browser notification if push is subscribed
      if (isPushSubscribed && notifications && notifications.length > 0) {
        const latestNotification = notifications[0];
        showBrowserNotification(latestNotification.title, {
          body: latestNotification.message,
          tag: 'new-notification',
        });
      }
    }
    
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount, soundEnabled, isPushSubscribed, notifications]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    
    // Navigate based on reference type
    if (notification.reference_type === 'task') {
      navigate('/tasks');
    } else if (notification.reference_type === 'finance') {
      navigate('/finance');
    } else if (notification.reference_type === 'lead_reminder') {
      navigate('/whatsapp');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-7 w-7 hover:bg-muted">
          <Bell className={cn(
            "h-7 w-7 transition-transform",
            (unreadCount ?? 0) > 0 && "animate-pulse"
          )} />
          {(unreadCount ?? 0) > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold">Notificações</h4>
          {unreadCount && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-3 w-3" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        
        {/* Settings section */}
        <div className="px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <Label htmlFor="sound-toggle" className="text-xs">Som</Label>
            </div>
            <Switch
              id="sound-toggle"
              checked={soundEnabled}
              onCheckedChange={handleSoundToggle}
            />
          </div>
          
          {isPushSupported && (
            <div className="flex items-center justify-between gap-4 mt-2">
              <div className="flex items-center gap-2">
                {isPushLoading ? (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                ) : (
                  <BellRing className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="push-toggle" className="text-xs">Push</Label>
              </div>
              <Switch
                id="push-toggle"
                checked={isPushSubscribed}
                onCheckedChange={() => toggleSubscription()}
                disabled={isPushLoading}
              />
            </div>
          )}
        </div>
        
        <ScrollArea className="h-[340px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : notifications && notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={(id) => markRead.mutate(id)}
                onClick={handleNotificationClick}
              />
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma notificação</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
