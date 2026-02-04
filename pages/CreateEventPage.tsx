import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createEvent } from '@/db/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [importance, setImportance] = useState(3);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: '请输入事件标题',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const event = await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || '未分类',
        importance
      });

      toast({
        title: '创建成功',
        description: '事件已创建'
      });

      navigate(`/events/${event.id}`);
    } catch (error) {
      toast({
        title: '创建失败',
        description: '无法创建事件，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const importanceLabels = ['低', '较低', '中等', '较高', '高'];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')} className="gap-2 mb-6">
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>新建事件</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">事件标题 *</Label>
                <Input
                  id="title"
                  placeholder="请输入事件标题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">事件内容</Label>
                <Textarea
                  id="description"
                  placeholder="请输入事件的详细描述（可选）"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="resize-none"
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/1000 字
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">分类</Label>
                <Input
                  id="category"
                  placeholder="请输入分类（可选）"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  不填写将默认为"未分类"
                </p>
              </div>

              <div className="space-y-3">
                <Label>重要性等级</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setImportance(level)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all',
                        importance === level
                          ? 'border-primary bg-accent'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Star
                        className={cn(
                          'w-6 h-6',
                          level === 1 && 'text-muted-foreground',
                          level === 2 && 'text-primary',
                          level === 3 && 'text-chart-2',
                          level === 4 && 'text-chart-4',
                          level === 5 && 'text-destructive',
                          importance === level && 'fill-current'
                        )}
                      />
                      <span className="text-xs text-muted-foreground">
                        {importanceLabels[level - 1]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? '创建中...' : '创建事件'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/')}>
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
