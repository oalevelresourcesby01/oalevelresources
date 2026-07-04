import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  useGetResourceStats, 
  useGetRecentResources, 
  useGetSyncStatus, 
  getGetSyncStatusQueryKey,
  useGetAnnouncements 
} from '@workspace/api-client-react';
import { FileText, Folder, CheckCircle, AlertCircle, RefreshCw, Layers, Megaphone, Activity } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetResourceStats();
  const { data: recentResources, isLoading: recentLoading } = useGetRecentResources({ limit: 5 });
  const { data: syncStatus, isLoading: syncLoading } = useGetSyncStatus({ query: { queryKey: getGetSyncStatusQueryKey(), refetchInterval: 3000 } });
  const { data: announcements, isLoading: announcementsLoading } = useGetAnnouncements();

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your O/A Level Resources platform.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PDFs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '-' : stats?.totalPdfs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalSizeBytes ? formatSize(stats.totalSizeBytes) : '0 B'} total size
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Folders</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? '-' : stats?.totalFolders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {stats?.totalLevels} levels, {stats?.totalSubjects} subjects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Announcements</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {announcementsLoading ? '-' : announcements?.filter(a => a.active).length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of {announcements?.length || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {syncStatus?.status === 'running' ? (
                <>
                  <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                  <span className="text-lg font-bold text-blue-500">Running</span>
                </>
              ) : syncStatus?.status === 'error' ? (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="text-lg font-bold text-destructive">Error</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="text-lg font-bold text-primary">Idle</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last sync: {syncStatus?.lastSync ? formatDistanceToNow(new Date(syncStatus.lastSync), { addSuffix: true }) : 'Never'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Resources</CardTitle>
            <CardDescription>Latest files added to the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLoading ? (
                <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
              ) : !recentResources?.length ? (
                <div className="text-sm text-muted-foreground text-center py-4">No recent resources</div>
              ) : (
                recentResources.map((resource) => (
                  <div key={resource.id} className="flex items-center border-b border-border/50 pb-4 last:border-0 last:pb-0">
                    <div className="bg-primary/10 p-2 rounded-md mr-4">
                      {resource.type === 'pdf' ? (
                        <FileText className="h-4 w-4 text-primary" />
                      ) : (
                        <Folder className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      <p className="text-sm font-medium leading-none truncate">{resource.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{resource.parentName || 'Root'}</p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {resource.modifiedAt ? formatDistanceToNow(new Date(resource.modifiedAt), { addSuffix: true }) : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Sync Progress</CardTitle>
            <CardDescription>Current drive synchronization details</CardDescription>
          </CardHeader>
          <CardContent>
            {syncStatus?.status === 'running' ? (
              <div className="space-y-4 mt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{syncStatus.message || 'Syncing files...'}</span>
                  <span className="text-muted-foreground">{syncStatus.progress || 0}%</span>
                </div>
                <Progress value={syncStatus.progress || 0} className="h-2" />
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Folders Scanned</p>
                    <p className="text-xl font-bold">{syncStatus.totalFolders?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Files Processed</p>
                    <p className="text-xl font-bold">{syncStatus.totalFiles?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="bg-muted p-3 rounded-full mb-4">
                  <RefreshCw className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No sync in progress</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                  The system is currently up to date. You can trigger a manual sync from the Drive Config page.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
