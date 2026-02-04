import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Clock, CheckCircle2, FolderOpen, Loader2, Calendar, RefreshCw, LogOut, User, Trash2, Share2, Search, Shield, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { getUserEvents, getEventStats, getAllCategories, getEventsByDateRange, deleteEvent, getEventWithRecords } from '@/db/api';
import { supabase } from '@/db/supabase';
import ImportanceStars from '@/components/ui/ImportanceStars';
import type { Event } from '@/types/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from 'miaoda-auth-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({ total: 0, ongoing: 0, closed: 0 });
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    checkAdminRole();
  }, [dateFilter]);

  const checkAdminRole = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && data && data.role === 'admin') {
      setIsAdmin(true);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      let eventsData: Event[];
      
      if (dateFilter === 'all') {
        eventsData = await getUserEvents();
      } else {
        const { startDate, endDate } = getDateRange(dateFilter);
        eventsData = await getEventsByDateRange(startDate, endDate);
      }
      
      const [statsData, categoriesData] = await Promise.all([
        getEventStats(),
        getAllCategories()
      ]);
      
      setEvents(eventsData);
      setStats(statsData);
      setCategories(categoriesData);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载事件数据，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await loadData();
      toast({
        title: '同步成功',
        description: '数据已更新'
      });
    } catch (error) {
      toast({
        title: '同步失败',
        description: '无法同步数据，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: '已退出登录'
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: '退出失败',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteClick = (event: Event, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;

    try {
      await deleteEvent(eventToDelete.id);
      setEvents(events.filter(e => e.id !== eventToDelete.id));
      toast({
        title: '删除成功',
        description: '事件已删除'
      });
      await loadData();
    } catch (error) {
      toast({
        title: '删除失败',
        description: '无法删除事件，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  const handleShareClick = async (event: Event, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const eventWithRecords = await getEventWithRecords(event.id);
      
      let shareText = `📋 ${eventWithRecords.title}\n`;
      shareText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      if (eventWithRecords.description) {
        shareText += `📝 事件内容：\n${eventWithRecords.description}\n\n`;
      }
      
      shareText += `📊 状态：${eventWithRecords.status === 'ongoing' ? '进行中' : '已闭环'}\n`;
      shareText += `📁 分类：${eventWithRecords.category}\n`;
      shareText += `⭐ 重要性：${'★'.repeat(eventWithRecords.importance)}${'☆'.repeat(5 - eventWithRecords.importance)}\n`;
      shareText += `📅 创建时间：${new Date(eventWithRecords.created_at).toLocaleString('zh-CN')}\n\n`;
      
      if (eventWithRecords.records && eventWithRecords.records.length > 0) {
        shareText += `📌 事件进展（共${eventWithRecords.records.length}条）：\n`;
        shareText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        eventWithRecords.records.forEach((record, index) => {
          const recordDate = new Date(record.created_at).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          shareText += `${index + 1}. [${recordDate}]\n`;
          shareText += `   ${record.ai_summary}\n\n`;
        });
      } else {
        shareText += `📌 暂无进展记录\n\n`;
      }
      
      if (eventWithRecords.summary) {
        shareText += `━━━━━━━━━━━━━━━━━━━━\n`;
        shareText += `💡 事件总结：\n${eventWithRecords.summary}\n`;
      }
      
      await navigator.clipboard.writeText(shareText);
      
      toast({
        title: '复制成功',
        description: '事件信息已复制到剪贴板'
      });
    } catch (error) {
      toast({
        title: '分享失败',
        description: '无法复制事件信息，请稍后重试',
        variant: 'destructive'
      });
    }
  };

  const getDateRange = (filter: string): { startDate: Date; endDate: Date } => {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let startDate = new Date();

    switch (filter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        break;
      default:
        startDate = new Date(0);
    }

    return { startDate, endDate };
  };

  const filteredEvents = events.filter(event => {
    // 状态筛选
    let statusMatch = true;
    if (activeTab === 'ongoing') statusMatch = event.status === 'ongoing';
    else if (activeTab === 'closed') statusMatch = event.status === 'closed';
    else if (activeTab !== 'all') statusMatch = event.category === activeTab;

    // 搜索关键词筛选
    if (!searchKeyword.trim()) return statusMatch;

    const keyword = searchKeyword.toLowerCase();
    const titleMatch = event.title.toLowerCase().includes(keyword);
    const descMatch = event.description?.toLowerCase().includes(keyword);
    const categoryMatch = event.category.toLowerCase().includes(keyword);

    return statusMatch && (titleMatch || descMatch || categoryMatch);
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold text-foreground mb-1">事件记录助手</h1>
              <p className="text-sm text-muted-foreground">记录重要事件的发展历程</p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="hidden xl:inline">管理</span>
                  </Button>
                </Link>
              )}
              <Link to="/summary">
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden xl:inline">总结</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                <span className="hidden xl:inline">同步</span>
              </Button>
              <Link to="/events/new">
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden xl:inline">新建事件</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{user?.email?.replace('@miaoda.com', '')}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              退出
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索事件标题、内容或分类..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">全部</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-3xl font-extrabold text-foreground">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">进行中</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-3xl font-extrabold text-primary">{stats.ongoing}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">已闭环</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-3xl font-extrabold text-muted-foreground">{stats.closed}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 w-full">
            <TabsList className="w-full xl:w-auto overflow-x-auto flex-nowrap">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="ongoing">进行中</TabsTrigger>
              <TabsTrigger value="closed">已闭环</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category} value={category}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full xl:w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部时间</SelectItem>
              <SelectItem value="today">今天</SelectItem>
              <SelectItem value="week">最近一周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="year">今年</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">暂无事件记录</p>
                <Link to="/events/new">
                  <Button>创建第一个事件</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            filteredEvents.map(event => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 xl:p-6">
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-2 xl:gap-3">
                    <Link to={`/events/${event.id}`} className="flex-1 min-w-0 space-y-2">
                      <h3 className="text-base xl:text-lg font-semibold text-foreground line-clamp-1">
                        {event.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {event.status === 'ongoing' ? (
                          <Badge variant="default" className="gap-1 text-xs">
                            <Clock className="w-3 h-3" />
                            进行中
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            已闭环
                          </Badge>
                        )}
                        <ImportanceStars importance={event.importance} size="sm" />
                      </div>
                      
                      {event.description && (
                        <p className="hidden xl:block text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <FolderOpen className="w-3 h-3" />
                          {event.category}
                        </span>
                        <span className="hidden xl:inline">创建于 {formatDateTime(event.created_at)}</span>
                        <span>更新 {formatDate(event.updated_at)}</span>
                      </div>
                    </Link>
                    
                    <div className="flex items-center gap-2 xl:flex-col xl:gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleShareClick(event, e)}
                        className="h-8 w-8 p-0"
                        title="分享"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteClick(event, e)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除事件「{eventToDelete?.title}」吗？此操作无法撤销，该事件的所有进展记录也将被删除。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
