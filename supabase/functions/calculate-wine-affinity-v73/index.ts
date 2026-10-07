import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { calculateEdgeLearnedProfileAudit } from '../_shared/matchrim73/matchrim-learning.ts';
import { mergeEdgeAffinityTrace } from '../_shared/matchrim73/matchrim-affinity.ts';
import { buildCompleteAffinity, buildUnknownAffinity, normalizeCompleteSensoryAttributes } from '../_shared/matchrim73/matchrim-affinity-input.ts';

const HOST = 'https://cbjynrbvrhcmpaojmqdp.supabase.co';
const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json'};
const respond = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify({...body,version:'complete-sensory-v73'}),{status,headers});

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null,{headers});
  if (req.method !== 'POST') return respond({error:'method_not_allowed'},405);
  if (Deno.env.get('SUPABASE_URL') !== HOST) return respond({error:'release_project_guard'},403);
  const authorization = req.headers.get('Authorization');
  if (!authorization) return respond({error:'authentication_required'},401);
  const client = createClient(HOST,Deno.env.get('SUPABASE_ANON_KEY') || '',{
    db:{schema:'public'}, global:{headers:{Authorization:authorization}},
  });
  try {
    const {data:{user},error:authError} = await client.auth.getUser(authorization.replace(/^Bearer\s+/i,''));
    if (authError || !user) return respond({error:'authentication_required'},401);
    let body;
    try {body=await req.json();} catch {return respond({error:'invalid_json'},400);}
    if (!body || typeof body !== 'object' || Array.isArray(body) || (!body.wine_id && !body.wine)) return respond({error:'wine_required'},400);
    const {data:base,error:profileError} = await client.from('quiz_results').select('potente,acidez,dulce,tanico,afrutado')
      .eq('user_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if (profileError) return respond({error:'profile_unavailable'},503);
    if (!base) return respond(buildUnknownAffinity('profile_missing'));
    const profileKeys = ['potente','acidez','dulce','tanico','afrutado'];
    if (Array.isArray(base) || profileKeys.some(key=>{
      const value=base[key];
      return typeof value!=='number'||!Number.isFinite(value)||value<1||value>5;
    })) return respond(buildUnknownAffinity('profile_invalid'));
    let wine = body.wine;
    if (body.wine_id) {
      if (typeof body.wine_id !== 'string') return respond({error:'wine_id_invalid'},400);
      const selected = await client.from('user_wines').select('sensory_attributes,place_details').eq('id',body.wine_id).eq('user_id',user.id).maybeSingle();
      if (selected.error) return respond({error:'wine_unavailable'},503);
      if (!selected.data) return respond({error:'wine_not_found'},404);
      wine=selected.data;
    }
    const attrs=normalizeCompleteSensoryAttributes(wine?.sensory_attributes);
    if (!attrs) {
      const unknown=buildUnknownAffinity();
      if (body.wine_id) {
        const previous=wine.place_details&&typeof wine.place_details==='object'&&!Array.isArray(wine.place_details)?wine.place_details:{};
        const update=await client.from('user_wines').update({matchrim_affinity:null,place_details:{...previous,
          matchrim_affinity_raw:null,matchrim_affinity_confidence:null,matchrim_affinity_model:unknown.affinity_model,
          matchrim_affinity_reason:unknown.reason,matchrim_affinity_sensory_source:'unknown'}}).eq('id',body.wine_id).eq('user_id',user.id);
        if (update.error) return respond({error:'affinity_persistence_failed'},503);
      }
      return respond(unknown);
    }
    const selected=await client.from('user_wines').select('rating,sensory_attributes,created_at,updated_at')
      .eq('user_id',user.id).eq('use_for_profile_training',true).not('rating','is',null).not('sensory_attributes','is',null);
    if (selected.error) return respond({error:'learning_unavailable'},503);
    const learned=calculateEdgeLearnedProfileAudit(base,selected.data||[]);
    const result=buildCompleteAffinity(learned.profile,attrs,learned.confidence,learned.samples);
    if (body.wine_id) {
      const update=await client.from('user_wines').update({matchrim_affinity:result.affinity,
        sensory_attributes:attrs,place_details:{...mergeEdgeAffinityTrace(wine.place_details,result),
          matchrim_affinity_reason:null,matchrim_affinity_sensory_source:result.sensory_source}})
        .eq('id',body.wine_id).eq('user_id',user.id);
      if (update.error) return respond({error:'affinity_persistence_failed'},503);
    }
    return respond({...result,temporary:!body.wine_id,contract:'complete-sensory-no-inference-v1'});
  } catch {
    return respond({error:'affinity_unavailable'},503);
  }
});
