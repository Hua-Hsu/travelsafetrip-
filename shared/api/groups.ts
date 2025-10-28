// shared/api/groups.ts

import { Group, GroupMember, CreateGroupRequest, JoinGroupRequest } from '../types';

export class GroupAPI {
  private static baseURL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  private static anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    
    const response = await fetch(`${this.baseURL}/functions/v1/${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': this.anonKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  private static getToken(): string {
    // 從 localStorage 或 AsyncStorage 獲取 token
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('supabase.auth.token');
      if (session) {
        return JSON.parse(session).access_token;
      }
    }
    return this.anonKey;
  }

  static async createGroup(request: CreateGroupRequest): Promise<Group> {
    return this.request<Group>('create-group', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  static async joinGroup(request: JoinGroupRequest): Promise<{
    group: Group;
    membership: GroupMember;
  }> {
    return this.request('join-group', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}