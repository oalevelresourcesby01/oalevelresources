import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Folder, FileText, ChevronRight, Home, Search, Loader2, ExternalLink, Calendar, HardDrive, Info } from 'lucide-react';
import { format } from 'date-fns';
import { 
  useGetLevels, 
  getGetLevelsQueryKey,
  useListNodeChildren, 
  getListNodeChildrenQueryKey,
  useGetNodeBreadcrumb,
  getGetNodeBreadcrumbQueryKey,
  useGetPdfUrl,
  getGetPdfUrlQueryKey,
  useSearch,
  getSearchQueryKey,
  ResourceNode,
  SearchResult
} from '@workspace/api-client-react';

function formatBytes(bytes?: number | null) {
  if (!bytes) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Resources() {
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<ResourceNode | SearchResult | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: rootLevels, isLoading: rootLoading } = useGetLevels({ query: { queryKey: getGetLevelsQueryKey(), enabled: !currentNodeId && !debouncedSearch } });
  const { data: childrenData, isLoading: childrenLoading } = useListNodeChildren(currentNodeId || '', { query: { queryKey: getListNodeChildrenQueryKey(currentNodeId || ''), enabled: !!currentNodeId && !debouncedSearch } });
  const { data: breadcrumbs } = useGetNodeBreadcrumb(currentNodeId || '', { query: { queryKey: getGetNodeBreadcrumbQueryKey(currentNodeId || ''), enabled: !!currentNodeId && !debouncedSearch } });
  
  const { data: pdfUrlData, isLoading: pdfUrlLoading } = useGetPdfUrl(selectedPdf?.id || '', { 
    query: { queryKey: getGetPdfUrlQueryKey(selectedPdf?.id || ''), enabled: !!selectedPdf, retry: false } 
  });

  const { data: searchData, isLoading: searchLoading } = useSearch(
    { q: debouncedSearch, pageSize: 50 }, 
    { query: { queryKey: getSearchQueryKey({ q: debouncedSearch, pageSize: 50 }), enabled: debouncedSearch.length > 2 } }
  );

  const isSearching = debouncedSearch.length > 2;
  const isLoading = isSearching ? searchLoading : (!currentNodeId ? rootLoading : childrenLoading);
  const items = !currentNodeId ? rootLevels : childrenData?.items;
  
  const folders = items?.filter((i: any) => i.type === 'folder') || [];
  const pdfs = items?.filter((i: any) => i.type === 'pdf') || [];

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resource Browser</h1>
          <p className="text-muted-foreground mt-2">Navigate and manage the synchronized Google Drive directory.</p>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search files or folders..." 
            className="pl-9 bg-background shadow-sm border-border"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="min-h-[600px] flex flex-col border-border/60 shadow-sm overflow-hidden bg-card/50">
        <CardHeader className="bg-muted/10 border-b py-3 px-6">
          <div className="flex items-center text-sm font-medium text-muted-foreground">
            {isSearching ? (
               <div className="text-foreground">Search Results for "{debouncedSearch}"</div>
            ) : (
               <div className="flex items-center flex-wrap gap-1">
                 <button 
                   onClick={() => setCurrentNodeId(null)} 
                   className="hover:text-primary transition-colors flex items-center px-1 py-0.5 rounded-md hover:bg-primary/10"
                 >
                   <Home className="w-4 h-4" />
                 </button>
                 {breadcrumbs?.map(crumb => (
                   <React.Fragment key={crumb.id}>
                     <ChevronRight className="w-4 h-4 opacity-40 mx-0.5" />
                     <button 
                       onClick={() => setCurrentNodeId(crumb.id)}
                       className="hover:text-primary transition-colors truncate max-w-[200px] px-1.5 py-0.5 rounded-md hover:bg-primary/10"
                     >
                       {crumb.name}
                     </button>
                   </React.Fragment>
                 ))}
               </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-6 flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary/50" />
              <p>Loading contents...</p>
            </div>
          ) : isSearching ? (
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/5">
                    <TableHead>Name</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead className="w-[100px]">Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!searchData?.results || searchData.results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        No results found for "{debouncedSearch}"
                      </TableCell>
                    </TableRow>
                  ) : (
                    searchData.results.map(res => (
                      <TableRow 
                        key={res.id}
                        className="cursor-pointer hover:bg-primary/5 transition-colors"
                        onClick={() => {
                          if (res.type === 'folder') {
                            setSearchQuery('');
                            setCurrentNodeId(res.id);
                          } else {
                            setSelectedPdf(res);
                          }
                        }}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {res.type === 'folder' ? (
                              <Folder className="w-4 h-4 text-primary/70 mr-3 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-primary/70 mr-3 shrink-0" />
                            )}
                            <span className="truncate max-w-[250px] block">{res.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="truncate max-w-[300px]" title={res.breadcrumb?.map(b => b.name).join(' / ')}>
                            {res.breadcrumb?.map(b => b.name).join(' / ') || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs uppercase tracking-wider text-muted-foreground">{res.type}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{res.type === 'pdf' ? formatBytes(res.size) : '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <>
              {folders.length === 0 && pdfs.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
                  <Folder className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">This folder is empty</p>
                  <p className="text-sm opacity-70 mt-1">Files synchronized from Drive will appear here.</p>
                </div>
              )}
              
              {folders.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                  {folders.map((folder: any) => (
                    <button
                      key={folder.id}
                      onClick={() => setCurrentNodeId(folder.id)}
                      className="flex items-start p-4 border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all text-left group bg-card shadow-sm hover:shadow-md"
                    >
                      <Folder className="w-8 h-8 text-primary/60 group-hover:text-primary mr-3 shrink-0 transition-colors" />
                      <div className="overflow-hidden">
                        <div className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">{folder.name}</div>
                        {folder.childCount !== undefined && (
                          <div className="text-xs text-muted-foreground mt-1 font-medium">{folder.childCount} items</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {pdfs.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Documents</h3>
                  <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/5">
                          <TableHead>Name</TableHead>
                          <TableHead className="w-[150px]">Size</TableHead>
                          <TableHead className="w-[200px]">Last Modified</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pdfs.map((pdf: any) => (
                          <TableRow 
                            key={pdf.id} 
                            className="cursor-pointer hover:bg-primary/5 transition-colors"
                            onClick={() => setSelectedPdf(pdf)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 text-primary/70 mr-3 shrink-0" />
                                <span className="truncate max-w-[400px] block">{pdf.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm font-medium">{formatBytes(pdf.size)}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {pdf.modifiedAt ? format(new Date(pdf.modifiedAt), 'MMM d, yyyy') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPdf} onOpenChange={(open) => !open && setSelectedPdf(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="truncate pt-1 leading-tight" title={selectedPdf?.name}>{selectedPdf?.name}</div>
            </DialogTitle>
            <DialogDescription className="pl-11">Document Details</DialogDescription>
          </DialogHeader>
          
          <div className="py-2 space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
              <div>
                <div className="text-xs text-muted-foreground font-medium mb-1 flex items-center uppercase tracking-wider"><HardDrive className="w-3 h-3 mr-1.5"/> File Size</div>
                <div className="text-sm font-semibold">{formatBytes(selectedPdf?.size)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-medium mb-1 flex items-center uppercase tracking-wider"><Calendar className="w-3 h-3 mr-1.5"/> Last Modified</div>
                <div className="text-sm font-semibold">
                  {selectedPdf?.modifiedAt ? format(new Date(selectedPdf.modifiedAt), 'PP') : '-'}
                </div>
              </div>
            </div>
            
            <div className="bg-blue-500/10 text-blue-700 dark:text-blue-400 p-3.5 rounded-lg text-sm flex items-start border border-blue-500/20">
              <Info className="w-5 h-5 mr-2.5 shrink-0 mt-0.5" />
              <p className="leading-relaxed">A secure download link is being generated. Once opened, you can view or download the file directly from Google Drive. Links expire after 1 hour.</p>
            </div>
          </div>

          <DialogFooter className="sm:justify-between pt-2">
            <Button variant="outline" onClick={() => setSelectedPdf(null)}>Close</Button>
            <Button 
              className="gap-2"
              disabled={pdfUrlLoading || !pdfUrlData?.url}
              onClick={() => {
                if (pdfUrlData?.url) window.open(pdfUrlData.url, '_blank');
              }}
            >
              {pdfUrlLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin"/> Generating Link...</>
              ) : (
                <><ExternalLink className="w-4 h-4"/> Open Document</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
