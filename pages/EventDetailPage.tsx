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

    let content =
