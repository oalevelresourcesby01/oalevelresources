import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, RefreshCw, Smartphone, Globe, Mail, Phone, Moon, Database, Eye, EyeOff } from 'lucide-react';
import { useGetAdminConfig, useUpdateAdminConfig, useChangePassword } from '@workspace/api-client-react';

export default function Settings() {
  const { toast } = useToast();
  const { data: config, isLoading } = useGetAdminConfig();
  const updateConfig = useUpdateAdminConfig();
  const changePassword = useChangePassword();

  const [formData, setFormData] = useState({
    appName: '',
    whatsappChannel: '',
    aboutUs: '',
    contactEmail: '',
    contactPhone: '',
    androidDownloadUrl: '',
    maintenanceMode: false,
    theme: 'light',
    cacheEnabled: true,
    cacheTtlMinutes: 60,
    maxDownloadSizeMb: 50
  });

  const [pwdData, setPwdData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPwd, setShowPwd] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  React.useEffect(() => {
    if (config) {
      setFormData({
        appName: config.appName || '',
        whatsappChannel: config.whatsappChannel || '',
        aboutUs: config.aboutUs || '',
        contactEmail: config.contactEmail || '',
        contactPhone: config.contactPhone || '',
        androidDownloadUrl: (config as any).androidDownloadUrl || '',
        maintenanceMode: config.maintenanceMode || false,
        theme: config.theme || 'light',
        cacheEnabled: config.cacheEnabled !== false, // default true
        cacheTtlMinutes: config.cacheTtlMinutes || 60,
        maxDownloadSizeMb: config.maxDownloadSizeMb || 50
      });
    }
  }, [config]);

  const handleSaveConfig = async () => {
    try {
      await updateConfig.mutateAsync({ data: formData });
      toast({ title: 'Settings saved successfully' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error.message || 'An error occurred while saving.'
      });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdData.newPassword !== pwdData.confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Passwords do not match' });
      return;
    }
    if (pwdData.newPassword.length < 8) {
      toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 8 characters' });
      return;
    }

    try {
      await changePassword.mutateAsync({
        data: {
          currentPassword: pwdData.currentPassword,
          newPassword: pwdData.newPassword
        }
      });
      toast({ title: 'Password updated successfully' });
      setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to update password',
        description: error.message || 'Invalid current password'
      });
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading configuration...</div>;
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-2">Manage application appearance, contact info, and preferences.</p>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>Details displayed on the public platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appName">Application Name</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="appName"
                  className="pl-9"
                  value={formData.appName}
                  onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contactEmail"
                    className="pl-9"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contactPhone"
                    className="pl-9"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappChannel">WhatsApp Channel Link</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="whatsappChannel"
                  className="pl-9"
                  value={formData.whatsappChannel}
                  onChange={(e) => setFormData({ ...formData, whatsappChannel: e.target.value })}
                  placeholder="https://whatsapp.com/channel/..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="androidDownloadUrl">Android App Download Link</Label>
              <p className="text-xs text-muted-foreground">
                When set, a "Download Android App" button appears on the public website homepage.
              </p>
              <div className="relative">
                <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="androidDownloadUrl"
                  className="pl-9"
                  value={formData.androidDownloadUrl}
                  onChange={(e) => setFormData({ ...formData, androidDownloadUrl: e.target.value })}
                  placeholder="https://drive.google.com/file/d/..."
                />
              </div>
            </div>

            <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>
              {updateConfig.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Save General Info
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System & Performance</CardTitle>
            <CardDescription>Configure cache, limits, and maintenance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
              <div className="flex items-center space-x-4">
                <div className="bg-orange-500/10 p-2 rounded-full">
                  <Moon className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <Label className="text-base font-semibold">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Show a maintenance page to public users.</p>
                </div>
              </div>
              <Switch
                checked={formData.maintenanceMode}
                onCheckedChange={(checked) => setFormData({ ...formData, maintenanceMode: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
              <div className="flex items-center space-x-4">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label className="text-base font-semibold">Enable API Cache</Label>
                  <p className="text-sm text-muted-foreground">Cache drive API responses to improve performance.</p>
                </div>
              </div>
              <Switch
                checked={formData.cacheEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, cacheEnabled: checked })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cacheTtlMinutes">Cache TTL (Minutes)</Label>
                <Input
                  id="cacheTtlMinutes"
                  type="number"
                  disabled={!formData.cacheEnabled}
                  value={formData.cacheTtlMinutes}
                  onChange={(e) => setFormData({ ...formData, cacheTtlMinutes: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDownloadSizeMb">Max Download Size (MB)</Label>
                <Input
                  id="maxDownloadSizeMb"
                  type="number"
                  value={formData.maxDownloadSizeMb}
                  onChange={(e) => setFormData({ ...formData, maxDownloadSizeMb: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Default Public Theme</Label>
              <Select value={formData.theme} onValueChange={(v) => setFormData({ ...formData, theme: v })}>
                <SelectTrigger id="theme" className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>
              {updateConfig.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Save System Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your admin account password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="currentPwd">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPwd"
                    type={showPwd.current ? 'text' : 'password'}
                    value={pwdData.currentPassword}
                    onChange={(e) => setPwdData({ ...pwdData, currentPassword: e.target.value })}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => ({ ...p, current: !p.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPwd.current ? 'Hide password' : 'Show password'}
                  >
                    {showPwd.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPwd">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPwd"
                    type={showPwd.new ? 'text' : 'password'}
                    value={pwdData.newPassword}
                    onChange={(e) => setPwdData({ ...pwdData, newPassword: e.target.value })}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => ({ ...p, new: !p.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPwd.new ? 'Hide password' : 'Show password'}
                  >
                    {showPwd.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPwd">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPwd"
                    type={showPwd.confirm ? 'text' : 'password'}
                    value={pwdData.confirmPassword}
                    onChange={(e) => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => ({ ...p, confirm: !p.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPwd.confirm ? 'Hide password' : 'Show password'}
                  >
                    {showPwd.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
