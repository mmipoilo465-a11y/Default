const noop = () => {};
const handler = { get: () => noop };
const stub = new Proxy({}, handler);
export default stub;
export const join = (...a) => a.join('/'), dirname = (p) => p, resolve = (...a) => a.join('/'), basename = (p) => p, sep = '/', normalize = (p) => p, extname = () => '';
export const existsSync = () => false, readFileSync = noop, writeFileSync = noop, mkdirSync = noop, readdirSync = () => [], statSync = noop, renameSync = noop, copyFileSync = noop, rmSync = noop, rm = noop;
export const fileURLToPath = (u) => String(u);
