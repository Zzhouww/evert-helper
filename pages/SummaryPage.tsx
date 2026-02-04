import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getEventsWithRecordsByDateRange } from '@/db/api';
import { generatePeriodSummary, type PeriodEvent } from '@/lib/ai';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

type PeriodType = 'day' | 'week' | 'month' | 'year';

export default function SummaryPage() {
  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [eventCount, setEventCount] = useState(0);
  const { toast } = useToast();

  const getPeriodDates = (type: PeriodType): { startDate: Date; endDate: Date } => {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let startDate: Date;

    switch (type) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        break;
    }

    return { startDate, endDate };
  };

  const formatDateRange = (startDate: Date, endDate: Date): string => {
    const start = startDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const end = endDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return `${start} - ${end}`;
  };

  const handleGenerateSummary = async () => {
    try {
      setLoading(true);
      setSummary('');
      setEventCount(0);

      const { startDate, endDate } = getPeriodDates(periodType);
      const eventsWithRecords = await getEventsWithRecordsByDateRange(startDate, endDate);

      if (eventsWithRecords.length === 0) {
        toast({
          title: '暂无数据',
          description: '该时间段内没有事件记录',
          variant: 'destructive'
        });
        return;
      }

      setEventCount(eventsWithRecords.length);

      // 转换为AI需要的格式
      const periodEvents: PeriodEvent[] = eventsWithRecords.map(event => ({
        title: event.title,
        description: event.description,
        category: event.category,
        status: event.status,
        importance: event.importance,
        created_at: event.created_at,
        updated_at: event.updated_at,
        records: (event.records || []).map(record => ({
          ai_summary: record.ai_summary || record.original_content,
          created_at: record.created_at
        }))
      }));

      const dateRange = formatDateRange(startDate, endDate);
      const result = await generatePeriodSummary(
        periodType,
        startDate.toLocaleDateString('zh-CN'),
        endDate.toLocaleDateString('zh-CN'),
        periodEvents
      );

      setSummary(result);

      toast({
        title: '生成成功',
        description: `已生成${dateRange}的总结报告`
      });
    } catch (error) {
      console.error('生成总结失败:', error);
      toast({
        title: '生成失败',
        description: '无法生成总结报告，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!summary) return;

    const { startDate, endDate } = getPeriodDates(periodType);
    const dateRange = formatDateRange(startDate, endDate);
    const periodNames = {
      day: '日',
      week: '周',
      month: '月',
      year: '年'
    };

    const content = `# ${periodNames[periodType]}总结报告\n\n时间范围：${dateRange}\n事件数量：${eventCount}\n\n---\n\n${summary}`;
    
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${periodNames[periodType]}总结_${startDate.toLocaleDateString('zh-CN').replace(/\//g, '-')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: '导出成功',
      description: '总结报告已下载'
    });
  };

  const handleExportAllEvents = async () => {
    try {
      const { startDate, endDate } = getPeriodDates(periodType);
      const eventsWithRecords = await getEventsWithRecordsByDateRange(startDate, endDate);

      if (eventsWithRecords.length === 0) {
        toast({
          title: '暂无数据',
          description: '该时间段内没有事件记录',
          variant: 'destructive'
        });
        return;
      }

      const dateRange = formatDateRange(startDate, endDate);
      const periodNames = {
        day: '日',
        week: '周',
        month: '月',
        year: '年'
      };

      // 构建完整的事件内容
      let content = `# ${periodNames[periodType]}事件记录导出\n\n`;
      content += `**时间范围**：${dateRange}\n`;
      content += `**事件总数**：${eventsWithRecords.length}\n\n`;
      content += `---\n\n`;

      // 按分类分组事件
      const eventsByCategory: { [key: string]: typeof eventsWithRecords } = {};
      eventsWithRecords.forEach(event => {
        if (!eventsByCategory[event.category]) {
          eventsByCategory[event.category] = [];
        }
        eventsByCategory[event.category].push(event);
      });

      // 输出每个分类的事件
      Object.keys(eventsByCategory).sort().forEach(category => {
        content += `## 📂 ${category}\n\n`;
        
        eventsByCategory[category].forEach((event, index) => {
          const duration = Math.ceil(
            (new Date(event.updated_at).getTime() - new Date(event.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          content += `### ${index + 1}. ${event.title}\n\n`;
          content += `- **状态**：${event.status === 'ongoing' ? '进行中' : '已闭环'}\n`;
          content += `- **重要程度**：${'⭐'.repeat(event.importance)}\n`;
          content += `- **创建时间**：${new Date(event.created_at).toLocaleString('zh-CN')}\n`;
          content += `- **更新时间**：${new Date(event.updated_at).toLocaleString('zh-CN')}\n`;
          content += `- **时间跨度**：${duration}天\n\n`;
          
          if (event.description) {
            content += `**事件描述**：\n${event.description}\n\n`;
          }

          const records = event.records || [];
          if (records.length > 0) {
            content += `**进展记录**（共${records.length}条）：\n\n`;
            records.forEach((record, recordIndex) => {
              const recordDate = new Date(record.created_at).toLocaleString('zh-CN');
              content += `${recordIndex + 1}. [${recordDate}]\n`;
              content += `   ${record.ai_summary || record.original_content}\n\n`;
            });
          } else {
            content += `**进展记录**：暂无\n\n`;
          }

          if (event.summary) {
            content += `**事件总结**：\n${event.summary}\n\n`;
          }

          content += `---\n\n`;
        });
      });

      // 添加统计信息
      content += `## 📊 统计信息\n\n`;
      content += `- 总事件数：${eventsWithRecords.length}\n`;
      content += `- 进行中：${eventsWithRecords.filter(e => e.status === 'ongoing').length}\n`;
      content += `- 已闭环：${eventsWithRecords.filter(e => e.status === 'closed').length}\n`;
      content += `- 分类数：${Object.keys(eventsByCategory).length}\n`;
      
      const totalRecords = eventsWithRecords.reduce((sum, event) => sum + (event.records?.length || 0), 0);
      content += `- 总进展记录数：${totalRecords}\n\n`;

      // 导出文件
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${periodNames[periodType]}事件记录_${startDate.toLocaleDateString('zh-CN').replace(/\//g, '-')}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: '导出成功',
        description: '所有事件内容已导出'
      });
    } catch (error) {
      console.error('导出失败:', error);
      toast({
        title: '导出失败',
        description: '无法导出事件内容，请稍后重试',
        variant: 'destructive'
      });
    }
  };

  const { startDate, endDate } = getPeriodDates(periodType);
  const dateRange = formatDateRange(startDate, endDate);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold text-foreground">事件总结</h1>
              <p className="text-sm text-muted-foreground mt-1">AI智能分析，生成结构化总结报告</p>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              选择时间范围
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="day">日总结</TabsTrigger>
                <TabsTrigger value="week">周总结</TabsTrigger>
                <TabsTrigger value="month">月总结</TabsTrigger>
                <TabsTrigger value="year">年总结</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                时间范围：{dateRange}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={handleExportAllEvents} 
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  导出所有事件
                </Button>
                <Button 
                  onClick={handleGenerateSummary} 
                  disabled={loading}
                  className="gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      生成总结
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {summary && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>总结报告</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownload}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  导出总结
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                共分析 {eventCount} 个事件
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {!summary && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                选择时间范围后，点击"生成总结"按钮
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                AI将为您生成该时间段内所有事件的结构化总结报告
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
