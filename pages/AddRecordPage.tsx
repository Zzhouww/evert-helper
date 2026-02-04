import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
// 建议统一使用 @ 别名，且注意组件名是大写 Button
import { Button } from "@/components/ui/button";
// 修正：card -> Card，去掉 .tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// 修正：textarea -> Textarea
import { Textarea } from "@/components/ui/textarea";
// 修正：label -> Label，去掉 .tsx
import { Label } from "@/components/ui/label";
import { getEventById, createEventRecord } from '@/db/api';
import { summarizeEventRecord } from '@/lib/ai';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/types/types';

export default function AddRecordPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getEventById(id);
      setEvent(data);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载事件信息，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast({
        title: '请输入进展内容',
        variant: 'destructive'
      });
      return;
    }

    if (!id) return;

    try {
      setProcessing(true);
      
      toast({
        title: 'AI整理中',
        description: '正在整理您的进展内容...'
      });

      const aiSummary = await summarizeEventRecord(content.trim());

      await createEventRecord({
        event_id: id,
        original_content: content.trim(),
        ai_summary: aiSummary
      });

      toast({
        title: '添加成功',
        description: '进展已记录'
      });

      navigate(`/events/${id}`);
    } catch (error) {
      toast({
        title: '添加失败',
        description: error instanceof Error ? error.message : '无法添加进展，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted-foreground mb-4">事件不存在</p>
        <Button onClick={() => navigate('/')}>返回首页</Button>
      </div>
    );
  }

  if (event.status === 'closed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted-foreground mb-4">该事件已闭环，无法添加进展</p>
        <Button onClick={() => navigate(`/events/${id}`)}>返回事件详情</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate(`/events/${id}`)} className="gap-2 mb-6">
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>添加进展</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              事件：{event.title}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="content">进展内容 *</Label>
                <Textarea
                  id="content"
                  placeholder="请详细描述事件的最新进展..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  className="resize-none"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground">
                  {content.length}/2000 字
                </p>
              </div>

              <div className="p-4 bg-accent rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-accent-foreground" />
                  <span className="text-sm font-medium text-accent-foreground">AI智能整理</span>
                </div>
                <p className="text-xs text-accent-foreground">
                  提交后，AI将自动整理您的内容，提取关键信息并生成简洁的进展记录
                </p>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={processing} className="flex-1">
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      AI整理中...
                    </>
                  ) : (
                    '提交'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/events/${id}`)}
                  disabled={processing}
                >
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
