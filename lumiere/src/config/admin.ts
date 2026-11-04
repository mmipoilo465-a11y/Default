/**
 * Хэш пароля руководителя (PBKDF2-SHA256). Сам пароль здесь не хранится.
 * Сменить пароль: npm run admin:password -- "новый-пароль"
 */
export const ADMIN_AUTH = {
  salt: '253b76873fd7ce600309bfd65278c360',
  iterations: 210000,
  hash: '04148a5a1d5117e4092b5308e09e6fb8d8392afd0c4e07366efe5cf9300101c1',
} as const;
