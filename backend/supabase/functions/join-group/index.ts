// backend/supabase/functions/join-group/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { inviteCode, deviceId, deviceName } = await req.json()

    // 查找群組
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single()

    if (groupError || !group) {
      throw new Error('群組不存在或邀請碼錯誤')
    }

    // 加入群組
    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        device_id: deviceId,
        device_name: deviceName,
      })
      .select()
      .single()

    if (memberError) {
      // 如果已經加入，更新最後活躍時間
      if (memberError.code === '23505') {
        const { data: updated } = await supabase
          .from('group_members')
          .update({ last_active_at: new Date().toISOString() })
          .eq('group_id', group.id)
          .eq('user_id', user.id)
          .eq('device_id', deviceId)
          .select()
          .single()
        
        return new Response(JSON.stringify({ group, membership: updated }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      throw memberError
    }

    return new Response(JSON.stringify({ group, membership }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})