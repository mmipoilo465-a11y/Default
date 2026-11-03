/** Мини-аналог clsx: склеивает truthy-классы */
export function cn(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(' ');
}
