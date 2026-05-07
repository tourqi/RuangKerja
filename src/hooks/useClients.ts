"use client";
import { getClients } from "@/services/clients";
import { Client } from "@/types/db";
import { useFetch } from "./useFetch";

export function useClients() {
  const { data: clients, loading, error, refetch } = useFetch<Client[]>(getClients, []);
  return { clients, loading, error, refetch };
}
