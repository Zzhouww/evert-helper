import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Profile {
  id: string;
  username: string;
  role: 'user' | 'admin';
  created_at: string;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
    loadProfiles();
  }, []);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data || data.role !== 'admin') {
      toast({
        title: '权限不足',
        description: '只有管理员可以访问此页面',
        variant: 'destructive'
      });
      navigate('/');
      return;
    }

    setCurrentUserRole(data.role);
  };

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载用户列表',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: '更新成功',
        description: '用户角色已更新'
      });

      await loadProfiles();
    } catch (error) {
      toast({
        title: '更新失败',
        description: '无法更新用户角色',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteClick = (profile: Profile) => {
    if (profile.id === user?.id) {
      toast({
        title: '操作失败',
        description: '不能删除自己的账户',
        variant: 'destructive'
      });
      return;
    }
    setUserToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      // 删除用户的所有事件和记录
      const { error: eventsError } = await supabase
        .from('events')
        .delete()
        .eq('user_id', userToDelete.id);

      if (eventsError) throw eventsError;

      // 删除用户资料
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (profileError) throw profileError;

      // 删除认证用户（需要管理员权限）
      const { error: authError } = await supabase.auth.admin.deleteUser(userToDelete.id);
      
      if (authError) {
        console.error('删除认证用户失败:', authError);
      }

      toast({
        title: '删除成功',
        description: '用户及其所有数据已删除'
      });

      await loadProfiles();
    } catch (error) {
      toast({
        title: '删除失败',
        description: '无法删除用户，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
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
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 xl:p-6">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl xl:text-3xl font-bold text-foreground">用户管理</h1>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              用户列表（共 {profiles.length} 人）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profiles.map((profile) => (
                <Card key={profile.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-foreground">
                            {profile.username || '未设置用户名'}
                          </h3>
                          <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                            {profile.role === 'admin' ? '管理员' : '普通用户'}
                          </Badge>
                          {profile.id === user?.id && (
                            <Badge variant="outline">当前账户</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          注册时间：{formatDateTime(profile.created_at)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={profile.role}
                          onValueChange={(value: 'user' | 'admin') => handleRoleChange(profile.id, value)}
                          disabled={profile.id === user?.id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">普通用户</SelectItem>
                            <SelectItem value="admin">管理员</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(profile)}
                          disabled={profile.id === user?.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除用户</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除用户「{userToDelete?.username}」吗？此操作无法撤销，该用户的所有事件和数据也将被永久删除。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
