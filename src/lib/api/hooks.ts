"use client";
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { api, ApiResponse, QueryParams } from "./client";

// Generic list hook
export function useList<T>(entity: string, params?: QueryParams, options?: Partial<UseQueryOptions<ApiResponse<T[]>>>) {
  return useQuery({
    queryKey: [entity, "list", params],
    queryFn: () => api.get<T[]>(`/${entity}`, params),
    ...options,
  });
}

// Generic single item hook
export function useDetail<T>(entity: string, id: string | null, options?: Partial<UseQueryOptions<ApiResponse<T>>>) {
  return useQuery({
    queryKey: [entity, "detail", id],
    queryFn: () => api.get<T>(`/${entity}/${id}`),
    enabled: !!id,
    ...options,
  });
}

// Generic create mutation
export function useCreate<T>(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<T>) => api.post<T>(`/${entity}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [entity] }); },
  });
}

// Generic update mutation
export function useUpdate<T>(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) => api.patch<T>(`/${entity}/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [entity] }); },
  });
}

// Generic delete mutation
export function useDelete(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/${entity}/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [entity] }); },
  });
}
