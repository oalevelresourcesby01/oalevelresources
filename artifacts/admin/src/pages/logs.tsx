import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { AlertCircle, Info, Bug, AlertTriangle, RefreshCw, Trash2, Search } from 'lucide-react';
import { useGetLogs, useClearLogs, GetLogsLevel } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

export default function Logs() {
  const [level, setLevel] = useState<GetLogsLevel | 'all'>('all');
  const [search, setSearch] = useState('');
  
  const { data: logsData, isLoading, refetch } = useGetLogs({
    level: level === 'all' ? undefined : level,
    limit: 100
  });
  
  const clearLogs = useClearLogs();
  const { toast } = useToast();

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all logs? This cannot be undone.')) return;
    try {
      await clearLogs.mutateAsync();
      toast({ title: 'Logs cleared successfully' });
      refetch();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to clear logs', description: e.message });
    }
  };

  const getLevelIcon = (logLevel: string) => {
    switch (logLevel.toLowerCase()) {
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'debug': return <Bug className="h-4 w-4 text-muted-foreground" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const filteredLogs = logsData?.logs.filter(log => 
    log.message.toLowerCase().includes(search.toLowerCase()) || 
    (log.context && log.context.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  return (
    <div className="p-8 space-y-8 flex flex-col h-full max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground mt-2">Monitor application events, sync jobs, and errors.</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="destructive" onClick={handleClearLogs} disabled={clearLogs.isPending || !logsData?.logs.length}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Logs
          </Button>
        </div>
      </div>

      <Card className="flex flex-col flex-1 min-h-[500px] overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search log messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <Select value={level} onValueChange={(v) => setLevel(v as any)}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Filter by Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[120px]">Level</TableHead>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[200px]">Context</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Loading logs...</TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No logs found matching criteria.</TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="group">
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getLevelIcon(log.level)}
                        <span className="font-medium capitalize">{log.level}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                    </TableCell>
                    <TableCell className="font-mono text-sm max-w-lg break-words">
                      {log.message}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono max-w-[200px] truncate" title={log.context || ''}>
                      {log.context || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
