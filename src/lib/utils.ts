import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Converte string de data para objeto Date sem shift de fuso horário.
 * Datas puras "YYYY-MM-DD" são tratadas como meio-dia local (não UTC meia-noite).
 */
export function parseLocalDate(date: string): Date {
  // Se for só data (YYYY-MM-DD), adiciona T12:00:00 para evitar UTC → dia anterior no Brasil
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Date(date + 'T12:00:00');
  return new Date(date);
}

export function formatDate(date: string): string {
  if (!date) return '—';
  const parsed = parseLocalDate(date);
  if (isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}
