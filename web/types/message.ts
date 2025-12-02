// Extended message types for Week 9

export type MessageType = 'text' | 'status' | 'meetup_reminder' | 'navigation_link';

export interface BaseMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    name: string;
  };
}

export interface NavigationActionData {
  type: 'meetup_point';
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address?: string;
}

export interface ExtendedMessage extends BaseMessage {
  message_type: MessageType;
  action_data?: NavigationActionData;
}

// Message templates for leaders
export const MESSAGE_TEMPLATES = {
  MEETUP_REMINDER: (meetupTime?: string) => ({
    message_type: 'meetup_reminder' as MessageType,
    content: meetupTime 
      ? `🔔 Reminder: Please return to the meetup point by ${meetupTime}`
      : '🔔 Reminder: Please return to the meetup point now',
  }),
  NAVIGATION_LINK: (coordinates: { latitude: number; longitude: number }, address?: string) => ({
    message_type: 'navigation_link' as MessageType,
    content: '📍 Tap to navigate back to the meetup point',
    action_data: {
      type: 'meetup_point' as const,
      coordinates,
      address,
    },
  }),
};

