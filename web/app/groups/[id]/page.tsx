'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import MessageCard from '@/components/chat/MessageCard';
import { ExtendedMessage } from '@/types/message';

export default function GroupChatPage() {
  const params = useParams();
  const groupId = params.id as string;
  
  const [group, setGroup] = useState<any>(null);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const deviceId = useRef('');

  useEffect(() => {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', id);
    }
    deviceId.current = id;

    // Check if user is leader
    checkLeaderStatus();
    
    loadGroup();
    loadMessages();
    const unsubscribe = subscribeToMessages();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkLeaderStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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
    } catch (error) {
      console.error('Error checking leader status:', error);
    }
  };

  const loadGroup = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      setGroup(data);
    } catch (error) {
      console.error('Error loading group:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          user:group_members!user_id(name)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`group-${groupId}`)
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

          setMessages((current) => [
            ...current,
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
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        group_id: groupId,
        user_id: userId,
        device_id: deviceId.current,
        device_name: navigator.userAgent.substring(0, 50),
        content: newMessage.trim(),
        message_type: 'text',
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied!');
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Group not found</p>
        <Link href="/groups" className="text-blue-600 hover:underline">
          Back to My Groups
        </Link>
      </div>
    );
  }

  const shareLink = `${process.env.NEXT_PUBLIC_APP_URL}/join?code=${group.invite_code}`;

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header - 原來的樣式 */}
      <div className="bg-white rounded-t-lg shadow-md p-4 mb-0">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/groups" className="text-blue-600 hover:underline text-sm">
              ← Back
            </Link>
            <h1 className="text-2xl font-bold mt-1 text-black">{group.name}</h1>
            <p className="text-sm text-gray-500">Code: {group.invite_code}</p>
          </div>
          
          {/* 按鈕組 - 保留原有 + 新增 Leader */}
          <div className="flex gap-2">
            {/* 原有的地圖按鈕 */}
            <Link
              href={`/groups/${groupId}/map`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Map
            </Link>
            
            {/* 原有的 QR Code 按鈕 */}
            <button
              onClick={() => setShowQR(!showQR)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
            >
              {showQR ? 'Hide' : 'QR'}
            </button>
            
            {/* 新增：Leader 按鈕 (只有 leader 看得到) */}
            {isLeader && (
              <Link
                href={`/groups/${groupId}/leader-overview-map`}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold"
              >
                Leader
              </Link>
            )}
          </div>
        </div>

        {/* 原有的 QR Code 顯示區域 */}
        {showQR && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-3 text-center text-black">Invite Others</h3>
            <div className="flex flex-col items-center">
              <QRCodeDisplay value={shareLink} size={180} />
              <div className="w-full mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={group.invite_code}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded-lg text-center font-bold text-black"
                  />
                  <button
                    onClick={() => copyToClipboard(group.invite_code)}
                    className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages - 原來的樣式 + MessageCard */}
      <div className="flex-1 bg-white shadow-md p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No messages yet. Start chatting!
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              // 如果是特殊訊息類型，使用 MessageCard
              if (message.message_type && message.message_type !== 'text') {
                return <MessageCard key={message.id} message={message} />;
              }
              
              // 原有的一般訊息顯示方式
              const isMe = message.device_id === deviceId.current;
              return (
                <div
                  key={message.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isMe
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    {!isMe && (
                      <p className="text-xs opacity-75 mb-1">
                        {message.device_name || message.user?.name || 'Unknown'}
                      </p>
                    )}
                    <p className="break-words">{message.content}</p>
                    <p className={`text-xs mt-1 ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input - 原來的樣式 */}
      <form
        onSubmit={sendMessage}
        className="bg-white rounded-b-lg shadow-md p-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black text-base"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

