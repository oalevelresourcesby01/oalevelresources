import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Database,
  RefreshCw,
  Plus,
  Trash2,
  List,
  Clock,
  FileText,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, opts);
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

interface KnowledgeStats {
  totalIndexed: number;
  totalChunks: number;
  lastIndexedAt: string | null;
  indexStatus: {
    status: 'idle' | 'running' | 'error';
    message: string | null;
    progress: number | null;
  };
}

interface IndexedResource {
  resourceId: string;
  resourceName: string;
  chunkCount: number;
  indexedAt: string;
}

interface SearchLog {
  queryPreview: string;
  chunksFound: number;
  resourceNames: string;
  createdAt: string;
}

interface ActionResult {
  success: boolean;
  indexed?: number;
  failed?: number;
  totalChunks?: number;
  removed?: number;
  error?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AiKnowledge() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'resources' | 'logs'>('resources');

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<KnowledgeStats>({
    queryKey: ['ai-knowledge-stats'],
    queryFn: () => apiFetch('/api/ai/knowledge/stats'),
    refetchInterval: (q) =>
      q.state.data?.indexStatus?.status === 'running' ? 2000 : false,
  });

  const { data: resources, isLoading: resourcesLoading } = useQuery<IndexedResource[]>({
    queryKey: ['ai-knowledge-resources'],
    queryFn: () => apiFetch('/api/ai/knowledge/resources'),
  });

  const { data: searchLogs, isLoading: logsLoading } = useQuery<SearchLog[]>({
    queryKey: ['ai-knowledge-search-logs'],
    queryFn: () => apiFetch('/api/ai/knowledge/search-logs'),
    enabled: activeTab === 'logs',
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ai-knowledge-stats'] });
    queryClient.invalidateQueries({ queryKey: ['ai-knowledge-resources'] });
    queryClient.invalidateQueries({ queryKey: ['ai-knowledge-search-logs'] });
  }, [queryClient]);

  const rebuild = useMutation<ActionResult, Error>({
    mutationFn: () => apiFetch('/api/ai/knowledge/rebuild', { method: 'POST' }),
    onSuccess: () => {
      // Operation is async; UI polls stats every 2 s while running
      toast({ title: 'Rebuild started', description: 'Progress shown below. This may take a few minutes for large libraries.' });
      invalidate();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Rebuild failed', description: err.message }),
  });

  const indexNew = useMutation<ActionResult, Error>({
    mutationFn: () => apiFetch('/api/ai/knowledge/index-new', { method: 'POST' }),
    onSuccess: () => {
      toast({ title: 'Indexing started', description: 'New PDFs are being indexed. Progress shown below.' });
      invalidate();
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Index failed', description: err.message }),
  });

  const removeDeleted = useMutation<ActionResult, Error>({
    mutationFn: () => apiFetch('/api/ai/knowledge/remove-deleted', { method: 'POST' }),
    onSuccess: (data) => {
      invalidate();
      toast({
        title: 'Cleanup complete',
        description: `${data.removed ?? 0} stale resource(s) removed from index.`,
      });
    },
    onError: (err) => toast({ variant: 'destructive', title: 'Cleanup failed', description: err.message }),
  });

  const isOperating = rebuild.isPending || indexNew.isPending || removeDeleted.isPending
    || stats?.indexStatus?.status === 'running';

  const statusIcon = stats?.indexStatus?.status === 'running'
    ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    : stats?.indexStatus?.status === 'error'
    ? <AlertCircle className="h-4 w-4 text-destructive" />
    : <CheckCircle className="h-4 w-4 text-green-500" />;

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Knowledge Manager</h1>
        <p className="text-muted-foreground mt-2">
          Index your Google Drive PDFs so the AI can search educational resources before answering.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Indexed PDFs</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '—' : (stats?.totalIndexed ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Chunks</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '—' : (stats?.totalChunks ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Indexed</p>
                <p className="text-sm font-semibold">
                  {statsLoading
                    ? '—'
                    : stats?.lastIndexedAt
                    ? new Date(stats.lastIndexedAt).toLocaleString()
                    : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Index Status Banner */}
      {stats?.indexStatus?.message && (
        <Card className={`border ${
          stats.indexStatus.status === 'error'
            ? 'border-destructive bg-destructive/5'
            : stats.indexStatus.status === 'running'
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
            : 'border-green-400 bg-green-50 dark:bg-green-950/20'
        }`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              {statusIcon}
              <div className="flex-1">
                <p className="text-sm font-medium">{stats.indexStatus.message}</p>
                {stats.indexStatus.status === 'running' && stats.indexStatus.progress !== null && (
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${stats.indexStatus.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetchStats()}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Build and maintain the knowledge index.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              onClick={() => rebuild.mutate()}
              disabled={isOperating}
            >
              {rebuild.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <RefreshCw className="mr-2 h-4 w-4" />}
              Rebuild Knowledge Index
            </Button>
            <p className="text-xs text-muted-foreground px-1">
              Clears and re-indexes all PDFs from scratch. Use after major Drive changes.
            </p>

            <div className="border-t pt-3" />

            <Button
              variant="outline"
              className="w-full"
              onClick={() => indexNew.mutate()}
              disabled={isOperating}
            >
              {indexNew.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Plus className="mr-2 h-4 w-4" />}
              Index Newly Added PDFs
            </Button>
            <p className="text-xs text-muted-foreground px-1">
              Indexes only PDFs not yet in the knowledge base. Faster than a full rebuild.
            </p>

            <div className="border-t pt-3" />

            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => removeDeleted.mutate()}
              disabled={isOperating}
            >
              {removeDeleted.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Trash2 className="mr-2 h-4 w-4" />}
              Remove Deleted Resources
            </Button>
            <p className="text-xs text-muted-foreground px-1">
              Cleans up index entries for PDFs that no longer exist in Drive.
            </p>
          </CardContent>
        </Card>

        {/* Resources / Logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'resources' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('resources')}
            >
              <List className="mr-2 h-4 w-4" />
              Indexed Resources
            </Button>
            <Button
              variant={activeTab === 'logs' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('logs')}
            >
              <Search className="mr-2 h-4 w-4" />
              AI Search Logs
            </Button>
          </div>

          <Card className="min-h-[480px]">
            <CardContent className="pt-6">
              {activeTab === 'resources' ? (
                resourcesLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !resources?.length ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Database className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm">No indexed resources yet.</p>
                    <p className="text-xs mt-1">Run "Index Newly Added PDFs" or "Rebuild" to start.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {resources.map((r) => (
                      <div
                        key={r.resourceId}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate font-medium">{r.resourceName}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <Badge variant="secondary" className="text-xs">
                            {r.chunkCount} chunks
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.indexedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                logsLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !searchLogs?.length ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Search className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm">No search logs yet.</p>
                    <p className="text-xs mt-1">Logs appear when the AI searches the knowledge index.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {searchLogs.map((log, i) => (
                      <div key={i} className="rounded-md border px-3 py-2 text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-muted-foreground truncate max-w-[60%]">
                            {log.queryPreview}
                          </span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <Badge variant={log.chunksFound > 0 ? 'default' : 'secondary'} className="text-xs">
                              {log.chunksFound} chunks
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {log.resourceNames && (
                          <p className="text-xs text-muted-foreground truncate">
                            📚 {log.resourceNames}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
