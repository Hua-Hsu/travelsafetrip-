// web/app/groups/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        setLoading(false);
        return;
      }

      const { data: memberships, error } = await supabase
        .from('group_members')
        .select('*, groups(*)')
        .eq('device_id', deviceId);

      if (error) throw error;

      const uniqueGroups = memberships?.reduce((acc: any[], curr) => {
        if (!acc.find(g => g.id === curr.groups.id)) {
          acc.push(curr.groups);
        }
        return acc;
      }, []);

      setGroups(uniqueGroups || []);
    } catch (error: any) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">My Groups</h1>

      {groups.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600 mb-4">You haven't joined any groups yet.</p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/create"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Create Group
            </Link>
            <Link
              href="/join"
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Join Group
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
            >
              <h3 className="text-xl font-semibold mb-2 text-black">{group.name}</h3>
              <p className="text-gray-600">Invite Code: {group.invite_code}</p>
              <p className="text-sm text-gray-500 mt-2">
                Created: {new Date(group.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
