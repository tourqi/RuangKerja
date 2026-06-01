alter table invoices add column if not exists rab_id uuid references rab(id) on delete set null;
create index if not exists invoices_rab_id_idx on invoices(rab_id);
