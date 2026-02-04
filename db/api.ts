import { supabase } from './supabase';
import type { 
  Event, 
  EventRecord, 
  CreateEventInput, 
  CreateEventRecordInput, 
  UpdateEventInput,
  EventWithRecords
} from '@/types/types';
import { getUserId } from '@/lib/user';

// 获取用户的所有事件
export const getUserEvents = async (): Promise<Event[]> => {
  const userId = await getUserId();
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

// 根据分类获取事件
export const getEventsByCategory = async (category: string): Promise<Event[]> => {
  const userId = await getUserId();
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

// 根据状态获取事件
export const getEventsByStatus = async (status: 'ongoing' | 'closed'): Promise<Event[]> => {
  const userId = await getUserId();
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .eq('status', status)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

// 获取单个事件详情
export const getEventById = async (eventId: string): Promise<Event | null> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// 获取事件及其所有记录
export const getEventWithRecords = async (eventId: string): Promise<EventWithRecords | null> => {
  const event = await getEventById(eventId);
  if (!event) return null;

  const records = await getEventRecords(eventId);
  
  return {
    ...event,
    records,
    recordCount: records.length
  };
};

// 创建新事件
export const createEvent = async (input: CreateEventInput): Promise<Event> => {
  const userId = await getUserId();
  if (!userId) throw new Error('用户未登录');
  
  const { data, error } = await supabase
    .from('events')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description || null,
      category: input.category || '未分类',
      importance: input.importance || 3
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 更新事件
export const updateEvent = async (eventId: string, input: UpdateEventInput): Promise<Event> => {
  const { data, error } = await supabase
    .from('events')
    .update(input)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 删除事件
export const deleteEvent = async (eventId: string): Promise<void> => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
};

// 获取事件的所有记录
export const getEventRecords = async (eventId: string): Promise<EventRecord[]> => {
  const { data, error } = await supabase
    .from('event_records')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

// 创建事件记录
export const createEventRecord = async (input: CreateEventRecordInput): Promise<EventRecord> => {
  const { data, error } = await supabase
    .from('event_records')
    .insert({
      event_id: input.event_id,
      original_content: input.original_content,
      ai_summary: input.ai_summary
    })
    .select()
    .single();

  if (error) throw error;

  // 更新事件的updated_at
  await supabase
    .from('events')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.event_id);

  return data;
};

// 删除事件记录
export const deleteEventRecord = async (recordId: string): Promise<void> => {
  const { error } = await supabase
    .from('event_records')
    .delete()
    .eq('id', recordId);

  if (error) throw error;
};

// 更新事件记录
export const updateEventRecord = async (recordId: string, aiSummary: string): Promise<void> => {
  const { error } = await supabase
    .from('event_records')
    .update({ ai_summary: aiSummary })
    .eq('id', recordId);

  if (error) throw error;
};

// 获取所有分类
export const getAllCategories = async (): Promise<string[]> => {
  const userId = await getUserId();
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from('events')
    .select('category')
    .eq('user_id', userId);

  if (error) throw error;
  
  const categories = Array.isArray(data) 
    ? [...new Set(data.map(item => item.category).filter(Boolean))]
    : [];
  
  return categories;
};

// 获取事件统计
export const getEventStats = async (): Promise<{
  total: number;
  ongoing: number;
  closed: number;
}> => {
  const userId = await getUserId();
  if (!userId) return { total: 0, ongoing: 0, closed: 0 };
  
  const { data: allEvents, error: allError } = await supabase
    .from('events')
    .select('status')
    .eq('user_id', userId);

  if (allError) throw allError;

  const events = Array.isArray(allEvents) ? allEvents : [];
  
  return {
    total: events.length,
    ongoing: events.filter(e => e.status === 'ongoing').length,
    closed: events.filter(e => e.status === 'closed').length
  };
};

// 根据时间段获取事件
export const getEventsByDateRange = async (startDate: Date, endDate: Date): Promise<Event[]> => {
  const userId = await getUserId();
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

// 获取时间段内的事件及其记录（用于生成总结）
export const getEventsWithRecordsByDateRange = async (
  startDate: Date, 
  endDate: Date
): Promise<EventWithRecords[]> => {
  const userId = await getUserId();
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      records:event_records (*)
    `)
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
};
