import { randomBytes } from './node-crypto.js';
export const token = (bytes = 24) => randomBytes(bytes).toString('base64url');
export const hashPassword = (pw) => 'demo$' + pw;
export const verifyPassword = (pw, stored) => stored === 'demo$' + pw;
export const genPassword = () => randomBytes(5).toString('hex');
