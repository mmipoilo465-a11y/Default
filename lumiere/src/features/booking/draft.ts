import type { Category } from '../../lib/types';

export interface Draft {
  category: Category;
  serviceId: string | null;
  /** id мастера или ANY_MASTER */
  masterId: string | null;
  date: string | null;
  start: number | null;
}

export interface Contact {
  name: string;
  phone: string;
  comment: string;
}

export const emptyDraft: Draft = { category: 'haircut', serviceId: null, masterId: null, date: null, start: null };
export const emptyContact: Contact = { name: '', phone: '', comment: '' };

/** Форматирует ввод в +7 (999) 123-45-67. */
export function formatPhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits[0] === '8') digits = '7' + digits.slice(1);
  if (digits[0] !== '7') digits = '7' + digits;
  digits = digits.slice(0, 11);
  const p = digits.slice(1);
  let out = '+7';
  if (p.length) out += ` (${p.slice(0, 3)}`;
  if (p.length >= 3) out += ')';
  if (p.length > 3) out += ` ${p.slice(3, 6)}`;
  if (p.length > 6) out += `-${p.slice(6, 8)}`;
  if (p.length > 8) out += `-${p.slice(8, 10)}`;
  return out;
}

export const isPhoneValid = (phone: string) => phone.replace(/\D/g, '').length === 11;
export const isNameValid = (name: string) => name.trim().length >= 2;
