// shared/types/index.ts

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  device_id: string;
  device_name: string | null;
  joined_at: string;
  last_active_at: string;
}

export interface CreateGroupRequest {
  name: string;
}

export interface JoinGroupRequest {
  inviteCode: string;
  deviceId: string;
  deviceName?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}