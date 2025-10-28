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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { inviteCode, deviceId, deviceName } = await req.json()

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single()

    if (groupError || !group) {
      throw new Error('群組不存在或邀請碼錯誤')
    }

    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .upsert({
        group_id: group.id,
        device_id: deviceId,
        device_name: deviceName,
        last_active_at: new Date().toISOString(),
      }, {
        onConflict: 'group_id,device_id'
      })
      .select()
      .single()

    if (memberError) {
      console.error('Member error:', memberError)
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
