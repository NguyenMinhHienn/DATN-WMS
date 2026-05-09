import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService, Notification } from '../services/notificationService';

export const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        try {
            const [notifData, count] = await Promise.all([
                notificationService.getNotifications(1, 10),
                notificationService.getUnreadCount()
            ]);
            setNotifications(notifData.data);
            setUnreadCount(count);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Tự động refetch mỗi phút
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRead = async (id: number) => {
        try {
            await notificationService.markAsRead(id);
            await fetchNotifications();
        } catch (error) {
            console.error('Lỗi khi đánh dấu đã đọc:', error);
        }
    };

    const handleReadAll = async () => {
        try {
            await notificationService.markAllAsRead();
            await fetchNotifications();
        } catch (error) {
            console.error('Lỗi khi đánh dấu tất cả đã đọc:', error);
        }
    };

    const handleNotificationClick = (notif: Notification) => {
        if (!notif.is_read) {
            handleRead(notif.id);
        }

        // Chuyển hướng dựa trên loại thông báo
        setIsOpen(false);
        const isAdminOrStaff = window.location.pathname.includes('/admin') || window.location.pathname.includes('/staff');
        if (notif.type === 'payment_receipt' || notif.type === 'debt_created' || notif.type === 'debt_reminder') {
            navigate(isAdminOrStaff ? '/admin/receivables' : '/my-receivables');
        } else if (notif.type === 'order_update') {
             navigate(isAdminOrStaff ? '/admin/orders' : '/orders');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'payment_receipt': return '💰';
            case 'debt_created': return '📝';
            case 'debt_reminder': return '⚠️';
            case 'order_update': return '📦';
            default: return '🔔';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { 
            hour: '2-digit', minute: '2-digit', 
            day: '2-digit', month: '2-digit', year: 'numeric' 
        });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-full transition-all focus:outline-none"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 lg:w-96 bg-white rounded-xl shadow-xl shadow-blue-900/10 border border-slate-100 z-50 overflow-hidden transform opacity-100 scale-100 transition-all origin-top-right">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-800">Thông báo</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleReadAll}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                Đánh dấu đã đọc tất cả
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-6 text-center text-slate-500">
                                <p className="text-4xl mb-2">📭</p>
                                <p className="text-sm">Không có thông báo nào</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {notifications.map((notif) => (
                                    <li 
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${!notif.is_read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="text-2xl flex-shrink-0">
                                                {getIcon(notif.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2 mb-1">
                                                    <p className={`text-sm font-medium leading-5 ${!notif.is_read ? 'text-slate-800' : 'text-slate-600'}`}>
                                                        {notif.title}
                                                    </p>
                                                    {!notif.is_read && (
                                                        <span className="inline-block w-2 h-2 mt-1.5 bg-blue-500 rounded-full flex-shrink-0"></span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-500 mb-1 line-clamp-2">
                                                    {notif.message}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {formatDate(notif.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                        <button 
                            className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
