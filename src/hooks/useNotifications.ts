"use client";
import { useCallback, useEffect, useState } from 'react';
import type { Notification } from '@/types/db';
import { getNotifications, markAllRead, markRead, upsertNotification } from '@/services/notifications';
import { useAuth } from '@/context/AuthContext';
import type { Lead, Project, Invoice, Client } from '@/types/db';

async function generateNotifications(
  userId: string,
  leads: Lead[],
  projects: Project[],
  invoices: Invoice[],
  clients: Client[]
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks: Promise<void>[] = [];

  for (const l of leads) {
    if (l.status !== 'Deal Won' && l.status !== 'Deal Lost' && l.follow_up_date) {
      const due = new Date(l.follow_up_date);
      if (due <= today) {
        const client = clients.find(c => c.id === l.client_id);
        const clientName = client?.name ?? `Lead #${l.id.slice(0, 8)}`;
        tasks.push(upsertNotification({
          user_id: userId,
          type: 'follow_up_due',
          title: `Follow-up: ${clientName}`,
          body: `Status: ${l.status} · ${new Date(l.follow_up_date).toLocaleDateString('id-ID')}`,
          link: `/leads/${l.id}`,
          entity_id: l.id,
          read: false,
        }));
      }
    }
  }

  for (const p of projects) {
    if (p.status !== 'Done' && p.deadline) {
      const deadline = new Date(p.deadline);
      if (deadline < today) {
        tasks.push(upsertNotification({
          user_id: userId,
          type: 'project_overdue',
          title: `Proyek Overdue: ${p.name}`,
          body: `Deadline: ${new Date(p.deadline).toLocaleDateString('id-ID')}`,
          link: `/projects/${p.id}`,
          entity_id: p.id,
          read: false,
        }));
      }
    }
  }

  for (const inv of invoices) {
    if (inv.status !== 'paid' && inv.due_date) {
      const due = new Date(inv.due_date);
      if (due < today) {
        tasks.push(upsertNotification({
          user_id: userId,
          type: 'invoice_overdue',
          title: `Invoice Jatuh Tempo: ${inv.invoice_number}`,
          body: `Outstanding: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(inv.total_amount - inv.paid_amount)}`,
          link: `/invoices/${inv.id}`,
          entity_id: inv.id,
          read: false,
        }));
      }
    }
  }

  await Promise.allSettled(tasks);
}

export function useNotifications(
  leads: Lead[],
  projects: Project[],
  invoices: Invoice[],
  clients: Client[]
) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [generated, setGenerated] = useState(false);

  const refetch = useCallback(async () => {
    if (!user) return;
    const data = await getNotifications(user.id).catch(() => [] as Notification[]);
    setNotifications(data);
  }, [user]);

  useEffect(() => {
    if (!user || generated) return;
    if (leads.length === 0 && projects.length === 0 && invoices.length === 0) return;
    setGenerated(true);
    generateNotifications(user.id, leads, projects, invoices, clients).then(refetch);
  }, [user, leads, projects, invoices, clients, generated, refetch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleMarkRead(id: string) {
    await markRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function handleMarkAllRead() {
    if (!user) return;
    await markAllRead(user.id).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markRead: handleMarkRead, markAllRead: handleMarkAllRead };
}
