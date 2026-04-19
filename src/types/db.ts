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

export interface Lead {
  id: string;
  client_id: string;
  status: LeadStatus;
  notes?: string;
  created_at?: string;
}

export type ProjectStatus = 'Design' | 'Production' | 'Installation' | 'Done';

export interface Project {
  id: string;
  client_id?: string;
  name: string;
  budget?: number;
  status: ProjectStatus;
  deadline?: string;
  created_at?: string;
}
