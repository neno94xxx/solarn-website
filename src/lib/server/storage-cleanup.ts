import type { SupabaseClient } from '@supabase/supabase-js';

export async function cleanupArticleImages(client:SupabaseClient):Promise<boolean> {
  // Durable queue survives timeouts; removing the same path again is safe.
  const {data,error}=await client.from('solar_storage_cleanup_queue').select('path').order('created_at').limit(300);
  if(error)throw new Error('Cleanup queue unavailable');
  if(!data?.length)return true;
  const paths=data.map(row=>row.path as string);
  const removed=await client.storage.from('solar-articles').remove(paths);
  if(removed.error)throw new Error('Storage cleanup failed');
  const acknowledged=await client.from('solar_storage_cleanup_queue').delete().in('path',paths);
  if(acknowledged.error)throw new Error('Cleanup acknowledgement failed');
  const remaining=await client.from('solar_storage_cleanup_queue').select('path').limit(1);
  if(remaining.error)throw new Error('Cleanup verification failed');
  return !remaining.data?.length;
}
