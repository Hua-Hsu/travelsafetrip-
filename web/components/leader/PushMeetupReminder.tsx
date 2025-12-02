'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, Navigation, X } from 'lucide-react';
import { MESSAGE_TEMPLATES } from '@/types/message';

interface PushMeetupReminderProps {
  groupId: string;
  userId: string;
  meetupPoint?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export default function PushMeetupReminder({ 
  groupId, 
  userId, 
  meetupPoint 
}: PushMeetupReminderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [reminderTime, setReminderTime] = useState('');

  const handlePushReminder = async (includeNavigation: boolean) => {
    if (isSending) return;
    setIsSending(true);

    try {
      // Get device_id from localStorage
      const deviceId = localStorage.getItem('device_id');
      
      // Send reminder message
      const reminderMessage = MESSAGE_TEMPLATES.MEETUP_REMINDER(reminderTime || undefined);
      
      const messageData: any = {
        group_id: groupId,
        device_id: deviceId,
        device_name: 'Leader',
        content: reminderMessage.content,
        message_type: reminderMessage.message_type,
      };
      
      const { error: reminderError } = await supabase
        .from('messages')
        .insert(messageData);

      if (reminderError) {
        console.error('Reminder error:', reminderError);
        throw reminderError;
      }

      // Send navigation link if requested and meetup point exists
      if (includeNavigation && meetupPoint) {
        const navMessage = MESSAGE_TEMPLATES.NAVIGATION_LINK(
          { 
            latitude: meetupPoint.latitude, 
            longitude: meetupPoint.longitude 
          },
          meetupPoint.address
        );

        const navMessageData: any = {
          group_id: groupId,
          device_id: deviceId,
          device_name: 'Leader',
          content: navMessage.content,
          message_type: navMessage.message_type,
          action_data: navMessage.action_data,
        };

        const { error: navError } = await supabase
          .from('messages')
          .insert(navMessageData);

        if (navError) {
          console.error('Navigation error:', navError);
          throw navError;
        }
      }

      // Close dialog and reset
      setIsOpen(false);
      setReminderTime('');
      alert('Reminder sent successfully! ✅');
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Failed to send reminder. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        <Bell className="w-5 h-5" />
        <span>Push Meetup Reminder</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Push Meetup Reminder</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Send a reminder to all group members to return to the meetup point.
              </p>

              {/* Optional Time Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meetup Time (Optional)
                </label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => handlePushReminder(false)}
                  disabled={isSending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Bell className="w-5 h-5" />
                  <span>{isSending ? 'Sending...' : 'Send Reminder Only'}</span>
                </button>

                {meetupPoint && (
                  <button
                    onClick={() => handlePushReminder(true)}
                    disabled={isSending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Navigation className="w-5 h-5" />
                    <span>{isSending ? 'Sending...' : 'Send with Navigation Link'}</span>
                  </button>
                )}

                {!meetupPoint && (
                  <p className="text-xs text-gray-500 text-center">
                    ⚠️ No meetup point set. Navigation link unavailable.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

