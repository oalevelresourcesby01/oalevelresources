import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderPlus, RefreshCw, ChevronRight, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { useGenerateFolders, usePreviewFolders } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

// Predefined Options
const LEVELS = ['O Level', 'IGCSE', 'AS Level', 'A2 Level'];
const SUBJECTS = [
  'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 
  'English', 'Urdu', 'Islamiat', 'Pakistan Studies', 'Economics', 
  'Accounting', 'Business Studies'
];
const CATEGORIES = ['Past Papers', 'Notes', 'Textbooks', 'Revision Notes'];
const YEARS = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString());
const SESSIONS = ['Feb-March', 'May-June', 'Oct-Nov'];
const VARIANTS = ['Variant 1', 'Variant 2', 'Variant 3'];
const PAPER_TYPES = ['Question Paper', 'Mark Scheme', 'Examiner Report', 'Insert'];

export default function FolderGenerator() {
  const { toast } = useToast();
  const generateFolders = useGenerateFolders();
  const previewFolders = usePreviewFolders();

  const [selections, setSelections] = useState<{
    levels: string[];
    subjects: string[];
    categories: string[];
    years: string[];
    sessions: string[];
    variants: string[];
    paperTypes: string[];
  }>({
    levels: [],
    subjects: [],
    categories: [],
    years: [],
    sessions: [],
    variants: [],
    paperTypes: [],
  });

  const [activeTab, setActiveTab] = useState('config');
  const [previewData, setPreviewData] = useState<any>(null);
  const [generationResult, setGenerationResult] = useState<any>(null);

  const toggleSelection = (key: keyof typeof selections, value: string) => {
    setSelections(prev => {
      const current = prev[key];
      const updated = current.includes(value) 
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const buildInputPayload = () => {
    // Construct the nested tree based on selections
    const payload = {
      levels: selections.levels.map(level => ({
        name: level,
        subjects: selections.subjects.map(subject => ({
          name: subject,
          categories: selections.categories.map(category => ({
            name: category,
            years: category === 'Past Papers' ? selections.years : undefined,
            sessions: category === 'Past Papers' ? selections.sessions : undefined,
            variants: category === 'Past Papers' ? selections.variants : undefined,
            paperTypes: category === 'Past Papers' ? selections.paperTypes : undefined,
          }))
        }))
      }))
    };
    return payload;
  };

  const handlePreview = async () => {
    if (!selections.levels.length || !selections.subjects.length || !selections.categories.length) {
      toast({ variant: 'destructive', title: 'Missing selections', description: 'Please select at least one level, subject, and category.' });
      return;
    }
    
    try {
      const payload = buildInputPayload();
      const result = await previewFolders.mutateAsync({ data: payload });
      setPreviewData(result);
      setActiveTab('preview');
      setGenerationResult(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Preview failed', description: e.message });
    }
  };

  const handleGenerate = async () => {
    if (!window.confirm('This will create actual folders in Google Drive. Proceed?')) return;
    
    try {
      const payload = buildInputPayload();
      const result = await generateFolders.mutateAsync({ data: payload });
      setGenerationResult(result);
      setActiveTab('result');
      toast({ title: 'Folder generation completed' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Generation failed', description: e.message });
    }
  };

  const Section = ({ title, options, stateKey }: { title: string, options: string[], stateKey: keyof typeof selections }) => (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm border-b pb-1">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {options.map(opt => (
          <div key={opt} className="flex items-center space-x-2">
            <Checkbox 
              id={`${stateKey}-${opt}`} 
              checked={selections[stateKey].includes(opt)}
              onCheckedChange={() => toggleSelection(stateKey, opt)}
            />
            <Label htmlFor={`${stateKey}-${opt}`} className="text-sm font-normal cursor-pointer">
              {opt}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Folder Generator</h1>
        <p className="text-muted-foreground mt-2">Bulk create standardized directory structures in Google Drive.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="config">1. Configure</TabsTrigger>
          <TabsTrigger value="preview" disabled={!previewData && activeTab !== 'preview'}>2. Preview</TabsTrigger>
          <TabsTrigger value="result" disabled={!generationResult && activeTab !== 'result'}>3. Result</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Structure Definition</CardTitle>
              <CardDescription>Select the combinations to generate. The hierarchy will be Level &gt; Subject &gt; Category.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <Section title="Levels" options={LEVELS} stateKey="levels" />
              <Section title="Subjects" options={SUBJECTS} stateKey="subjects" />
              <Section title="Categories" options={CATEGORIES} stateKey="categories" />
              
              {selections.categories.includes('Past Papers') && (
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-6">
                  <div className="flex items-center text-sm font-medium text-primary">
                    <FileText className="w-4 h-4 mr-2" />
                    Past Papers Specific Folders (Applies inside 'Past Papers' category)
                  </div>
                  <Section title="Years" options={YEARS} stateKey="years" />
                  <Section title="Sessions" options={SESSIONS} stateKey="sessions" />
                  <Section title="Variants" options={VARIANTS} stateKey="variants" />
                  <Section title="Paper Types" options={PAPER_TYPES} stateKey="paperTypes" />
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t pt-6 flex justify-between">
              <Button variant="outline" onClick={() => setSelections({ levels: [], subjects: [], categories: [], years: [], sessions: [], variants: [], paperTypes: [] })}>
                Clear All
              </Button>
              <Button onClick={handlePreview} disabled={previewFolders.isPending}>
                {previewFolders.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
                Generate Preview
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Structure Preview</CardTitle>
              <CardDescription>Review the {previewData?.total || 0} folders that will be created.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-muted/10 font-mono text-sm">
                {previewData?.folders.map((f: any, i: number) => (
                  <div key={i} className="flex items-center py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2 rounded">
                    <span className="opacity-40 select-none mr-2">{'>'.repeat(f.depth)}</span>
                    <span className="text-primary mr-2">📁</span>
                    {f.path.split('/').pop()}
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t pt-6 flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('config')}>Back to Config</Button>
              <Button onClick={handleGenerate} disabled={generateFolders.isPending}>
                {generateFolders.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
                Create {previewData?.total || 0} Folders in Drive
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="result">
          <Card>
            <CardHeader>
              <CardTitle>Generation Results</CardTitle>
              <CardDescription>Execution summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-muted/20 rounded-lg border">
                  <div className="text-3xl font-bold">{generationResult?.total || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Processed</div>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="text-3xl font-bold text-green-600">{generationResult?.created || 0}</div>
                  <div className="text-xs text-green-600/80 mt-1">Created</div>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="text-3xl font-bold text-blue-600">{generationResult?.skipped || 0}</div>
                  <div className="text-xs text-blue-600/80 mt-1">Skipped (Existed)</div>
                </div>
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="text-3xl font-bold text-destructive">{generationResult?.errors || 0}</div>
                  <div className="text-xs text-destructive/80 mt-1">Errors</div>
                </div>
              </div>

              <ScrollArea className="h-[300px] border rounded-md p-4 bg-muted/5">
                <div className="space-y-2">
                  {generationResult?.details?.map((detail: any, i: number) => (
                    <div key={i} className="flex items-start text-sm">
                      {detail.status === 'created' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                      ) : detail.status === 'skipped' ? (
                        <ChevronRight className="h-4 w-4 text-blue-500 mr-2 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive mr-2 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <span className="font-mono text-muted-foreground">{detail.path}</span>
                        {detail.error && <div className="text-destructive text-xs mt-1">{detail.error}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button variant="outline" onClick={() => { setActiveTab('config'); setGenerationResult(null); setPreviewData(null); }}>
                Start New Generation
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
