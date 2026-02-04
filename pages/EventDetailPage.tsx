import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Clock, CheckCircle2, Download, Edit, Loader2, Sparkles, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { getEventWithRecords, updateEvent, deleteEvent, deleteEventRecord, updateEventRecord } from '@/db/api';
import { generateEventSummary } from '@/lib/ai';
import ImportanceStars from '@/components/ui/ImportanceStars';
import type { EventWithRecords, EventRecord } from '@/types/types';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventWithRecords | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRecordDialogOpen, setDeleteRecordDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<EventRecord | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
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
      const data = await getEventWithRecords(id);
      setEvent(data);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载事件详情，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEvent = async () => {
    if (!event || !id) return;

    try {
      setClosing(true);
      
      const summary = await generateEventSummary(
        event.title,
        event.records || []
      );

      await updateEvent(id, {
        status: 'closed',
        summary
      });

      toast({
        title: '事件已闭环',
        description: 'AI已生成事件总结'
      });

      loadEvent();
    } catch (error) {
      toast({
        title: '闭环失败',
        description: '无法闭环事件，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setClosing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteEvent(id);
      toast({
        title: '删除成功',
        description: '事件已删除'
      });
      navigate('/');
    } catch (error) {
      toast({
        title: '删除失败',
        description: '无法删除事件，请稍后重试',
        variant: 'destructive'
      });
    }
  };

  const handleExport = () => {
    if (!event) return;

    let content = `事件：${event.title}\n`;
    content += `分类：${event.category}\n`;
    content += `状态：${event.status === 'ongoing' ? '进行中' : '已闭环'}\n`;
    content += `创建时间：${new Date(event.created_at).toLocaleString('zh-CN')}\n\n`;

    if (event.records && event.records.length > 0) {
      content += '=== 事件进展 ===\n\n';
      event.records.forEach((record, index) => {
        content += `${index + 1}. [${new Date(record.created_at).toLocaleString('zh-CN')}]\n`;
        content += `${record.ai_summary}\n\n`;
      });
    }

    if (event.summary) {
      content += '=== 事件总结 ===\n\n';
      content += event.summary;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title}_${new Date().toLocaleDateString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: '导出成功',
      description: '事件内容已导出为文本文件'
    });
  };

  const handleDeleteRecordClick = (record: EventRecord) => {
    setRecordToDelete(record);
    setDeleteRecordDialogOpen(true);
  };

  const handleDeleteRecordConfirm = async () => {
    if (!recordToDelete) return;

    try {
      await deleteEventRecord(recordToDelete.id);
      toast({
        title: '删除成功',
        description: '进展记录已删除'
      });
      await loadEvent();
    } catch (error) {
      toast({
        title: '删除失败',
        description: '无法删除进展记录，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setDeleteRecordDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const handleEditRecordClick = (record: EventRecord) => {
    setEditingRecordId(record.id);
    setEditingContent(record.ai_summary);
  };

  const handleSaveRecordEdit = async (recordId: string) => {
    if (!editingContent.trim()) {
      toast({
        title: '内容不能为空',
        variant: 'destructive'
      });
      return;
    }

    try {
      await updateEventRecord(recordId, editingContent.trim());
      toast({
        title: '保存成功',
        description: '进展记录已更新'
      });
      setEditingRecordId(null);
      setEditingContent('');
      await loadEvent();
    } catch (error) {
      toast({
        title: '保存失败',
        description: '无法保存进展记录，请稍后重试',
        variant: 'destructive'
      });
    }
  };

  const handleCancelRecordEdit = () => {
    setEditingRecordId(null);
    setEditingContent('');
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        <Link to="/">
          <Button>返回首页</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              导出
            </Button>
            <Link to={`/events/${id}/edit`}>
              <Button variant="outline" className="gap-2">
                <Edit className="w-4 h-4" />
                编辑
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-3">{event.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <Badge variant={event.status === 'ongoing' ? 'default' : 'secondary'} className="gap-1">
                    {event.status === 'ongoing' ? (
                      <>
                        <Clock className="w-3 h-3" />
                        进行中
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        已闭环
                      </>
                    )}
                  </Badge>
                  <span>分类：{event.category}</span>
                  <ImportanceStars importance={event.importance} size="sm" showLabel />
                </div>
                <div className="text-xs text-muted-foreground">
                  创建于 {formatDateTime(event.created_at)}
                </div>
              </div>
            </div>

            {event.description && (
              <div className="mb-4 p-4 bg-secondary rounded-lg">
                <p className="text-sm text-foreground whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {event.summary && (
              <div className="mt-4 p-4 bg-accent rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-accent-foreground" />
                  <span className="font-semibold text-accent-foreground">AI总结</span>
                </div>
                <p className="text-sm text-accent-foreground whitespace-pre-wrap">{event.summary}</p>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              {event.status === 'ongoing' && (
                <>
                  <Link to={`/events/${id}/add-record`} className="flex-1">
                    <Button className="w-full gap-2">
                      <Plus className="w-4 h-4" />
                      添加进展
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={closing}>
                        {closing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          '标记闭环'
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认闭环事件？</AlertDialogTitle>
                        <AlertDialogDescription>
                          闭环后，AI将自动生成事件总结。您仍可以查看和导出事件内容。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCloseEvent}>确认闭环</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                删除事件
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-foreground">事件进展</h2>
          
          {!event.records || event.records.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">暂无进展记录</p>
                {event.status === 'ongoing' && (
                  <Link to={`/events/${id}/add-record`}>
                    <Button>添加第一条进展</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              <div className="space-y-6">
                {event.records.map((record, index) => (
                  <div key={record.id} className="relative pl-12">
                    <div className="absolute left-0 top-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-primary-foreground" />
                    </div>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(record.created_at)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRecordClick(record)}
                              className="h-7 w-7 p-0"
                              title="编辑"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRecordClick(record)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              title="删除"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {editingRecordId === record.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="min-h-[100px]"
                              placeholder="编辑进展内容..."
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveRecordEdit(record.id)}
                              >
                                保存
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelRecordEdit}
                              >
                                取消
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-foreground whitespace-pre-wrap">{record.ai_summary}</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除事件「{event?.title}」吗？此操作无法撤销，该事件的所有进展记录也将被删除。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteRecordDialogOpen} onOpenChange={setDeleteRecordDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除进展记录</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除这条进展记录吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRecordConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
