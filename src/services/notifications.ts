import { supabase } from './supabase';
import type { Notification } from '@/types/db';

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as Notification[];
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

export async function upsertNotification(
  notif: Omit<Notification, 'id' | 'created_at'>
): Promise<void> {
  await supabase.from('notifications').upsert(
    [notif],
    { onConflict: 'user_id,type,entity_id', ignoreDuplicates: true }
  );
}
