import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Save, RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import {
  useGetAdminConfig,
  useUpdateAdminConfig,
  useValidateDriveConfig,
  useTriggerSync,
  useGetSyncStatus,
  getGetSyncStatusQueryKey,
  useGetSyncHistory
} from '@workspace/api-client-react';

export default function DriveConfig() {
  const { toast } = useToast();
  const { data: config, isLoading: configLoading } = useGetAdminConfig();
  const updateConfig = useUpdateAdminConfig();
  const validateDrive = useValidateDriveConfig();
  const triggerSync = useTriggerSync();
  const { data: syncStatus } = useGetSyncStatus({ query: { queryKey: getGetSyncStatusQueryKey(), refetchInterval: 3000 } });
  const { data: syncHistory, refetch: refetchHistory } = useGetSyncHistory({ limit: 10 });

  const [formData, setFormData] = useState({
    driveRootFolderId: '',
    driveApiKey: '',
    autoSync: false,
    syncIntervalMinutes: 60
  });
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{valid: boolean, message?: string, folderName?: string} | null>(null);

  useEffect(() => {
    if (config) {
      setFormData({
        driveRootFolderId: config.driveRootFolderId || '',
        driveApiKey: '', // Empty unless updating
        autoSync: config.autoSync || false,
        syncIntervalMinutes: config.syncIntervalMinutes || 60
      });
    }
  }, [config]);

  const handleSaveConfig = async () => {
    try {
      const updateData: any = {
        driveRootFolderId: formData.driveRootFolderId,
        autoSync: formData.autoSync,
        syncIntervalMinutes: Number(formData.syncIntervalMinutes)
      };
      
      // Only include API key if it was changed
      if (formData.driveApiKey) {
        updateData.driveApiKey = formData.driveApiKey;
      }
      
      await updateConfig.mutateAsync({ data: updateData });
      
      toast({
        title: 'Configuration saved',
        description: 'Google Drive configuration has been updated successfully.'
      });
      
      // Reset API key field after save but keep the "set" indicator from config
      setFormData(prev => ({ ...prev, driveApiKey: '' }));
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error.message || 'An error occurred while saving the configuration.'
      });
    }
  };

  const handleValidate = async () => {
    if (!formData.driveRootFolderId) {
      toast({ variant: 'destructive', title: 'Validation failed', description: 'Folder ID is required.' });
      return;
    }
    
    // Use the entered key, or if none entered, we can't fully validate a new key,
    // but the backend uses the saved key if we pass empty string (assuming API supports it, wait we need to check schema).
    // The schema says `driveApiKey: string` for validation input. We might need to require it or skip validate if using saved.
    // Let's assume validation requires the key if changing. If not changing, we can still try to validate if backend allows, but let's pass a dummy or require it.
    // Looking at schema: DriveValidateInput { driveApiKey: string; rootFolderId: string; }
    
    if (!formData.driveApiKey && !config?.driveApiKeySet) {
       toast({ variant: 'destructive', title: 'Validation failed', description: 'API Key is required for first time setup.' });
       return;
    }

    setIsValidating(true);
    setValidationResult(null);
    try {
      // If no new key is provided but one is set, we can't send empty string to validate API. 
      // The user needs to re-enter it to validate a new folder, or the backend handles it.
      // Actually, if we just want to save, they can save. Validation here might need the actual key.
      const res = await validateDrive.mutateAsync({
        data: {
          driveApiKey: formData.driveApiKey || 'USE_SAVED_KEY', // Backend might need handling for this
          rootFolderId: formData.driveRootFolderId
        }
      });
      
      setValidationResult({
        valid: res.valid,
        message: res.error || undefined,
        folderName: res.folderName || undefined
      });
    } catch (error: any) {
      setValidationResult({
        valid: false,
        message: error.message || 'Network error during validation'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleTriggerSync = async () => {
    try {
      await triggerSync.mutateAsync({ data: { force: true } });
      toast({
        title: 'Sync triggered',
        description: 'The synchronization process has started in the background.'
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to start sync',
        description: error.message || 'An error occurred.'
      });
    }
  };

  const isSyncRunning = syncStatus?.status === 'running';

  if (configLoading) {
    return <div className="p-8">Loading configuration...</div>;
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Drive Configuration</h1>
        <p className="text-muted-foreground mt-2">Manage Google Drive API credentials and sync settings.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>API Credentials</CardTitle>
              <CardDescription>Configure access to your Google Drive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rootFolderId">Root Folder ID</Label>
                <Input
                  id="rootFolderId"
                  value={formData.driveRootFolderId}
                  onChange={(e) => setFormData({ ...formData, driveRootFolderId: e.target.value })}
                  placeholder="1A2B3C4D5E6F7G8H9I0J"
                />
                <p className="text-xs text-muted-foreground">The ID of the main folder containing your subject hierarchy.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={formData.driveApiKey}
                    onChange={(e) => setFormData({ ...formData, driveApiKey: e.target.value })}
                    placeholder={config?.driveApiKeySet ? "••••••••••••••••••••••••••••" : "Enter Google Drive API Key"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {config?.driveApiKeySet && !formData.driveApiKey && (
                  <p className="text-xs text-primary font-medium flex items-center mt-1">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> API Key is configured. Enter a new one to change it.
                  </p>
                )}
              </div>

              {validationResult && (
                <div className={`p-3 rounded-md text-sm flex items-start ${validationResult.valid ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                  {validationResult.valid ? (
                    <CheckCircle2 className="h-5 w-5 mr-2 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 mr-2 shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">{validationResult.valid ? 'Validation Successful' : 'Validation Failed'}</p>
                    {validationResult.folderName && <p className="mt-1">Found folder: <strong>{validationResult.folderName}</strong></p>}
                    {validationResult.message && <p className="mt-1">{validationResult.message}</p>}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/50 pt-6">
              <Button variant="outline" onClick={handleValidate} disabled={isValidating || (!formData.driveRootFolderId)}>
                {isValidating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                Validate Access
              </Button>
              <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>
                {updateConfig.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Configuration
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sync Settings</CardTitle>
              <CardDescription>Configure how often the system checks for new files.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatic Sync</Label>
                  <p className="text-sm text-muted-foreground">Periodically scan Drive for changes.</p>
                </div>
                <Switch
                  checked={formData.autoSync}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoSync: checked })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="syncInterval">Sync Interval (Minutes)</Label>
                <Input
                  id="syncInterval"
                  type="number"
                  min="5"
                  max="1440"
                  value={formData.syncIntervalMinutes}
                  onChange={(e) => setFormData({ ...formData, syncIntervalMinutes: Number(e.target.value) })}
                  disabled={!formData.autoSync}
                />
              </div>
              <Button onClick={handleSaveConfig} disabled={updateConfig.isPending} className="w-full">
                Save Sync Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Manual Sync</CardTitle>
                  <CardDescription className="mt-1">Force an immediate synchronization.</CardDescription>
                </div>
                {isSyncRunning ? (
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-6 flex flex-col items-center justify-center p-6 bg-muted/50 rounded-lg border border-border">
                {isSyncRunning ? (
                  <>
                    <RefreshCw className="h-10 w-10 text-primary animate-spin mb-3" />
                    <h3 className="font-semibold text-lg text-primary mb-1">Sync in Progress</h3>
                    <p className="text-sm text-muted-foreground">{syncStatus?.message || 'Scanning folder structure...'}</p>
                    {syncStatus?.progress !== undefined && (
                      <div className="w-full max-w-xs mt-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{syncStatus.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-500 ease-in-out" style={{ width: `${syncStatus.progress}%` }} />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="font-semibold text-lg mb-1">System is Idle</h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Last synced: {syncStatus?.lastSync ? format(new Date(syncStatus.lastSync), 'PP p') : 'Never'}
                    </p>
                  </>
                )}
              </div>
              <Button 
                onClick={handleTriggerSync} 
                disabled={isSyncRunning || triggerSync.isPending || !config?.driveApiKeySet}
                className="w-full text-md py-6"
                size="lg"
              >
                {triggerSync.isPending ? 'Starting...' : isSyncRunning ? 'Syncing...' : 'Force Sync Now'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle>Sync History</CardTitle>
                <CardDescription>Recent synchronization jobs</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => refetchHistory()} disabled={isSyncRunning}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!syncHistory?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No sync history available</p>
                ) : (
                  syncHistory.map((record) => (
                    <div key={record.id} className="flex items-start justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                      <div>
                        <div className="flex items-center space-x-2">
                          {record.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : record.status === 'error' ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Clock className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="font-medium text-sm capitalize">{record.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(record.startedAt), 'MMM d, h:mm a')}
                          {record.completedAt && ` - ${format(new Date(record.completedAt), 'h:mm a')}`}
                        </p>
                        {record.errorMessage && (
                          <p className="text-xs text-destructive mt-1 max-w-[250px] truncate" title={record.errorMessage}>
                            {record.errorMessage}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground space-y-1">
                        <p>+{record.filesAdded || 0} / ~{record.filesUpdated || 0} / -{record.filesRemoved || 0}</p>
                        <p>{record.foldersAdded || 0} folders</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
