'use client';

import { ExtendedMessage } from '@/types/message';
import { Bell, Navigation, MapPin } from 'lucide-react';

interface MessageCardProps {
  message: ExtendedMessage;
}

export default function MessageCard({ message }: MessageCardProps) {
  // Handle navigation action
  const handleNavigate = () => {
    if (!message.action_data?.coordinates) return;

    const { latitude, longitude } = message.action_data.coordinates;
    
    // Detect device type
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let url: string;
    
    if (isIOS) {
      // Apple Maps
      url = `maps://?daddr=${latitude},${longitude}`;
    } else if (isAndroid) {
      // Google Maps Navigation
      url = `google.navigation:q=${latitude},${longitude}`;
    } else {
      // Web fallback - Google Maps
      url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    }
    
    window.open(url, '_blank');
  };

  // Render based on message type
  switch (message.message_type) {
    case 'meetup_reminder':
      return (
        <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-lg my-2">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-900">
                {message.user?.name || 'Leader'}
              </p>
              <p className="text-purple-800 mt-1">{message.content}</p>
              <p className="text-xs text-purple-600 mt-2">
                {new Date(message.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      );

    case 'navigation_link':
      return (
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg my-2">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                {message.user?.name || 'Leader'}
              </p>
              <p className="text-blue-800 mt-1">{message.content}</p>
              
              {message.action_data?.address && (
                <p className="text-sm text-blue-700 mt-2">
                  📍 {message.action_data.address}
                </p>
              )}

              <button
                onClick={handleNavigate}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Navigation className="w-4 h-4" />
                <span>Navigate Now</span>
              </button>

              <p className="text-xs text-blue-600 mt-2">
                {new Date(message.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      );

    case 'status':
      return (
        <div className="bg-gray-50 border-l-4 border-gray-400 p-3 rounded-r-lg my-2">
          <div className="flex items-start gap-2">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{message.user?.name}:</span>{' '}
              {message.content}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(message.created_at).toLocaleString()}
          </p>
        </div>
      );

    default:
      // Regular text message
      return (
        <div className="bg-white border border-gray-200 p-3 rounded-lg my-2">
          <p className="text-sm font-medium text-gray-900">
            {message.user?.name}
          </p>
          <p className="text-gray-800 mt-1">{message.content}</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(message.created_at).toLocaleString()}
          </p>
        </div>
      );
  }
}

