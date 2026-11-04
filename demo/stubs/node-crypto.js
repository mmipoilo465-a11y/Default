class Bytes extends Uint8Array {
  toString(enc) {
    if (enc === 'hex') return [...this].map((x) => x.toString(16).padStart(2, '0')).join('');
    const b64 = btoa(String.fromCharCode(...this));
    return enc === 'base64url' ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64;
  }
}
export function randomBytes(n) { const b = new Bytes(n); crypto.getRandomValues(b); return b; }
export const randomUUID = () => crypto.randomUUID();
export default { randomBytes, randomUUID };
