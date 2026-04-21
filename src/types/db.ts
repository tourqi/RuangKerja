export interface Client {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  project_name?: string;
  property_type?: string;
  budget_range?: string;
  lead_status?: string;
  source?: string;
  priority?: string;
}

export type LeadStatus = 'New Lead' | 'Contacted' | 'Survey' | 'Deal' | 'Lost';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Lead {
  id: string;
  client_id: string;
  status: LeadStatus;
  priority?: Priority;
  source?: string;
  follow_up_date?: string;
  last_contacted_at?: string;
  closed_at?: string;
  updated_at?: string;
  notes?: string;
  stage_order?: number;
  assigned_to?: string;
  created_by?: string;
  created_at?: string;
}

export type ProjectStatus = 'Planning' | 'Design' | 'Production' | 'Installation' | 'Done';

export const projectStatusLabel: Record<ProjectStatus, string> = {
  Planning: 'Planning',
  Design: 'Design',
  Production: 'Produksi',
  Installation: 'Instalasi',
  Done: 'Selesai',
};

export interface Project {
  id: string;
  client_id?: string;
  name: string;
  value?: number;
  status: ProjectStatus;
  start_date?: string;
  deadline?: string;
  assigned_to?: string;
  progress?: number;
  created_at?: string;
}
