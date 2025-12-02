'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ExtendedMessage } from '@/types/message';
import MessageCard from '@/components/chat/MessageCard';
import { Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ChatPage() {
  const params = useParams();
  const groupId = params.id as string;
  
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [isLeader, setIsLeader] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get member info
      const { data: memberData } = await supabase
        .from('group_members')
        .select('id, role')
        .eq('group_id', groupId)
        .eq('user_id', session.user.id)
        .single();

      if (memberData) {
        setUserId(memberData.id);
        setIsLeader(memberData.role === 'leader');
      }

      // Get group name
      const { data: groupData } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .single();

      if (groupData) {
        setGroupName(groupData.name);
      }

      // Fetch messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          group_id,
          user_id,
          message_type,
          action_data,
          user:group_members!user_id(name)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (messagesData) {
        setMessages(messagesData as any);
      }
    };

    fetchData();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          // Fetch the user name for the new message
          const { data: userData } = await supabase
            .from('group_members')
            .select('name')
            .eq('id', payload.new.user_id)
            .single();

          setMessages((prev) => [
            ...prev,
            {
              ...payload.new,
              user: userData,
            } as ExtendedMessage,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId) return;

    try {
      await supabase.from('messages').insert({
        group_id: groupId,
        user_id: userId,
        content: newMessage.trim(),
        message_type: 'text',
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4">
        <Link
          href={`/groups/${groupId}/map`}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-black">{groupName}</h1>
          <p className="text-sm text-gray-600">Group Chat</p>
        </div>
        
        {isLeader && (
          <Link
            href={`/groups/${groupId}/leader-overview-map`}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            Leader Overview
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((message) => (
          <MessageCard key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}

