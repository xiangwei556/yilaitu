import { notification } from 'antd';
import { useAuthStore } from '../stores/useAuthStore';

type MessageHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = Infinity;
  private reconnectTimeout: any = null;
  private messageHandlers: MessageHandler[] = [];
  private userId: number | null = null;
  
  private lastMessageId: any = null;
  private lastMessageKey: string | null = null;
  private lastMessageTimestamp: number | null = null;
  
  private heartbeatInterval: any = null;
  private heartbeatTimeout: any = null;
  private missedHeartbeats = 0;
  private readonly HEARTBEAT_INTERVAL = 30000;
  private readonly HEARTBEAT_TIMEOUT = 5000;
  private readonly MAX_MISSED_HEARTBEATS = 3;
  
  private static instance: WebSocketService;
  
  private constructor() {
    this.url = '';
  }
  
  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public connect(userId: number) {
    console.log('=== WebSocketService.connect called ===', 'userId:', userId, 'current ws state:', this.ws?.readyState, 'this instance:', this);
    
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      console.log('=== Already connected or connecting, skipping ===');
      return;
    }
    
    this.userId = userId;
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = 'api.yilaitu.com';
    const wsUrl = `${wsProtocol}//${host}/v1/message/ws/${userId}`;
    
    console.log('=== Connecting to WebSocket ===', 'url:', wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      
      this.ws = ws;
      
      ws.onopen = () => {
        console.log('=== WebSocket connected ===', 'url:', wsUrl);
        this.reconnectAttempts = 0;
        this.missedHeartbeats = 0;
        this.startHeartbeat();
      };
      
      ws.onmessage = (event) => {
        console.log('=== WebSocket message received ===', 'event:', event);
        
        if (event.data === 'pong') {
          this.missedHeartbeats = 0;
          return;
        }
        
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('=== Failed to parse WebSocket message ===', error);
          this.handleMessage({});
        }
      };
      
      ws.onclose = (event) => {
        console.log('=== WebSocket disconnected ===', 'code:', event.code, 'reason:', event.reason);
        this.stopHeartbeat();
        
        if (event.code !== 1000) {
          this.ws = null;
          
          if (event.code === 1006) {
            console.warn('WebSocket abnormal closure (1006), will attempt to reconnect');
          }
          
          this.reconnect();
        } else {
          this.ws = null;
        }
      };
      
      ws.onerror = (error) => {
        console.error('=== WebSocket error ===', error);
      };
    } catch (error) {
      console.error('=== Failed to create WebSocket ===', error);
      this.ws = null;
    }
  }

  public disconnect() {
    console.log('=== WebSocketService.disconnect called ===');
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
        this.missedHeartbeats++;
        
        if (this.missedHeartbeats > this.MAX_MISSED_HEARTBEATS) {
          console.warn('Too many missed heartbeats, closing connection');
          this.ws.close(1006, 'Too many missed heartbeats');
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  public addMessageHandler(handler: MessageHandler) {
    console.log('=== WebSocketService.addMessageHandler called ===');
    console.log('Current number of handlers before add:', this.messageHandlers.length);
    
    if (this.messageHandlers.length >= 1) {
      console.log('=== Already have a message handler, skipping ===');
      return () => {};
    }
    
    this.messageHandlers.push(handler);
    console.log('Current number of handlers after add:', this.messageHandlers.length);
    
    return () => {
      console.log('=== WebSocketService.removeMessageHandler called ===');
      console.log('Current number of handlers before remove:', this.messageHandlers.length);
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
      console.log('Current number of handlers after remove:', this.messageHandlers.length);
    };
  }

  public getMessageHandlersCount(): number {
    return this.messageHandlers.length;
  }

  private handleMessage(data: any) {
    console.log('=== WebSocketService.handleMessage called ===');
    console.log('This instance:', this);
    console.log('WebSocket instance:', this.ws);
    console.log('Message data:', data);
    console.log('Current timestamp:', Date.now());
    console.log('Number of message handlers:', this.messageHandlers.length);
    console.log('Message handlers:', this.messageHandlers);
    
    const messageKey = JSON.stringify(data);
    if (this.lastMessageKey === messageKey && this.lastMessageTimestamp && Date.now() - this.lastMessageTimestamp < 1000) {
      console.log('=== Skipping duplicate message ===');
      return;
    }
    
    this.lastMessageKey = messageKey;
    this.lastMessageTimestamp = Date.now();
    
    if (data.type === 'points_update') {
      this.handlePointsUpdate(data);
    }
    
    if (data.title && data.content) {
      this.showCustomNotification(data.title, data.content, data.id);
    }
    
    this.messageHandlers.forEach(handler => {
      handler(data);
    });
  }

  private handlePointsUpdate(data: any) {
    console.log('=== Handling points update ===', data);
    
    if (data.points !== undefined && data.user_id === this.userId) {
      const { updatePoints } = useAuthStore.getState();
      updatePoints(data.points);
      console.log('=== Points updated ===', data.points);
    }
  }

  private showCustomNotification(title: string, content: string, messageId?: number) {
    const notificationContainer = document.createElement('div');
    notificationContainer.className = 'fixed top-6 right-6 z-[100] animate-[slideIn_0.3s_ease-out_forwards] sm:block';
    notificationContainer.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-100 dark:border-gray-700 w-80 overflow-hidden cursor-pointer hover:shadow-2xl transition-shadow duration-200">
        <div class="p-4 flex items-start gap-3">
          <div class="flex-shrink-0">
            <div class="h-10 w-10 bg-[#4C3BFF]/10 dark:bg-[#4C3BFF]/20 rounded-full flex items-center justify-center">
              <span class="material-symbols-outlined text-[#4C3BFF] text-xl">mark_email_unread</span>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">${title}</h4>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${content}</p>
          </div>
          <button class="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300 transition-colors" onclick="event.stopPropagation(); this.closest('.fixed').remove()">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>
    `;

    const notificationContent = notificationContainer.querySelector('div > div');
    if (notificationContent) {
      notificationContent.addEventListener('click', () => {
        const event = new CustomEvent('notificationClick', {
          detail: { title, content, messageId }
        });
        document.dispatchEvent(event);
        
        if (notificationContainer.parentNode) {
          notificationContainer.classList.add('animate-[slideOut_0.3s_ease-in_forwards]');
          setTimeout(() => {
            if (notificationContainer.parentNode) {
              notificationContainer.parentNode.removeChild(notificationContainer);
            }
          }, 300);
        }
      });
    }

    document.body.appendChild(notificationContainer);

    setTimeout(() => {
      if (notificationContainer.parentNode) {
        notificationContainer.classList.add('animate-[slideOut_0.3s_ease-in_forwards]');
        setTimeout(() => {
          if (notificationContainer.parentNode) {
            notificationContainer.parentNode.removeChild(notificationContainer);
          }
        }, 300);
      }
    }, 4500);
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.userId) {
      this.reconnectAttempts++;
      const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${timeout}ms...`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect(this.userId!);
      }, timeout);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached, giving up');
    }
  }
}

export const webSocketService = WebSocketService.getInstance();
