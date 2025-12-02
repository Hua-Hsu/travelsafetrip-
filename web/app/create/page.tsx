'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CreateGroupPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 1. 取得用戶 session
      const { data: { session } } = await supabase.auth.getSession();
      
      // 2. 創建群組
      const { data: groupData, error: createError } = await supabase.functions.invoke('create-group', {
        body: { name: groupName },
      });
      if (createError) throw createError;
      
      // 3. 自動將創建者加入群組並設為 leader
      const deviceId = generateDeviceId();
      const deviceName = navigator.userAgent.split(' ').slice(0, 3).join(' ');
      
      const { error: joinError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: session?.user?.id || null,  // 新增：加入 user_id
          device_id: deviceId,
          device_name: deviceName,
          role: 'leader',  // ⭐ 重點：自動設為 leader
        });

      if (joinError) {
        console.error('Error auto-joining group:', joinError);
        // 即使加入失敗也繼續，因為群組已經創建了
      }
      
      // 4. 直接跳轉到聊天室
      router.push(`/groups/${groupData.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
      console.error('Error details:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Create Group</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
          <input 
            type="text" 
            value={groupName} 
            onChange={(e) => setGroupName(e.target.value)} 
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black" 
            placeholder="Enter group name..." 
            disabled={loading}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
          />
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        <button 
          onClick={handleCreate} 
          disabled={loading} 
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {loading ? 'Creating...' : 'Create Group'}
        </button>
      </div>
    </div>
  );
}

