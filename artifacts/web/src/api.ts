const BASE = "/api";

async function jget<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export interface PublicConfig {
  appName?: string;
  whatsappChannel?: string;
  androidDownloadUrl?: string | null;
  aiEnabled?: boolean;
  maintenanceMode?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  active: boolean;
  priority?: number;
  createdAt: string;
}

export interface ResourceNode {
  id: string;
  driveId: string;
  name: string;
  type: "folder" | "pdf";
  depth: number;
  parentId: string | null;
  mimeType: string | null;
  size: number | null;
  modifiedAt: string | null;
  childCount: number;
  createdAt: string;
}

export interface Stats {
  totalPdfs: number;
  totalFolders: number;
  totalLevels: number;
  totalSubjects: number;
  lastSync: string | null;
}

export const api = {
  config: () => jget<PublicConfig>(`${BASE}/config`),
  announcements: () => jget<Announcement[]>(`${BASE}/announcements?active=true`),
  levels: () => jget<ResourceNode[]>(`${BASE}/resources/levels`),
  stats: () => jget<Stats>(`${BASE}/resources/stats`),
  node: (id: string) => jget<ResourceNode>(`${BASE}/resources/nodes/${id}`),
  children: (id: string) =>
    jget<{ items: ResourceNode[]; total: number }>(`${BASE}/resources/nodes/${id}/children`),
  breadcrumb: (id: string) =>
    jget<{ id: string; name: string }[]>(`${BASE}/resources/nodes/${id}/breadcrumb`),
  pdfUrl: (id: string) => jget<{ url: string }>(`${BASE}/resources/pdf/${id}/url`),
  search: (q: string, page = 1) =>
    jget<{ results: any[]; total: number }>(
      `${BASE}/search?q=${encodeURIComponent(q)}&page=${page}`
    ),
  aiChat: (body: { message: string; sessionId: string; imageBase64?: string; pdfText?: string }) =>
    fetch(`${BASE}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (res) => {
      const data = await res.json() as {
        reply: string;
        sessionId: string;
        relatedResources?: { resourceId: string; resourceName: string }[];
      };
      if (!res.ok) throw new Error((data as any)?.error || "AI request failed");
      return {
        reply: data.reply,
        sessionId: data.sessionId,
        // Normalise server field names → display field names
        relatedResources: data.relatedResources?.map((r) => ({ id: r.resourceId, name: r.resourceName })),
      };
    }),
};
