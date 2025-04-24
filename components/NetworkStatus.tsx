import { useState, useEffect, useRef } from 'react';
import type { ReactElement } from 'react';

// 网络状态指示器组件
export default function NetworkStatus(): ReactElement | null {
  const [isOnline, setIsOnline] = useState<boolean>(typeof window !== 'undefined' ? navigator.onLine : true);
  const [showStatus, setShowStatus] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // SSR 环境下不执行
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 如果是在线状态，并且不需要显示状态，则不渲染任何内容
  if (isOnline && !showStatus) return null;

  return (
    <div 
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-md z-50 transition-all duration-300 ${
        isOnline ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`}
    >
      <div className="flex items-center">
        <div 
          className={`w-3 h-3 rounded-full mr-2 ${
            isOnline ? 'bg-green-200 animate-pulse' : 'bg-red-200'
          }`}
        />
        <span>
          {isOnline ? '网络已连接' : '网络已断开 - 请检查您的网络连接'}
        </span>
      </div>
    </div>
  );
} 