// 数据库表类型定义

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  status: 'ongoing' | 'closed';
  importance: number;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRecord {
  id: string;
  event_id: string;
  original_content: string;
  ai_summary: string;
  created_at: string;
}

// 扩展类型（用于前端展示）
export interface EventWithRecords extends Event {
  records?: EventRecord[];
  recordCount?: number;
}

// 创建事件的输入类型
export interface CreateEventInput {
  title: string;
  description?: string;
  category?: string;
  importance?: number;
}

// 创建事件记录的输入类型
export interface CreateEventRecordInput {
  event_id: string;
  original_content: string;
  ai_summary: string;
}

// 更新事件的输入类型
export interface UpdateEventInput {
  title?: string;
  description?: string;
  category?: string;
  importance?: number;
  status?: 'ongoing' | 'closed';
  summary?: string;
}
