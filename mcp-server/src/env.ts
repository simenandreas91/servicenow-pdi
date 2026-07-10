export function env(name: string): string | undefined {
  const runtime = (globalThis as unknown as { Netlify?: { env?: { get(name: string): string | undefined } } }).Netlify;
  return runtime?.env?.get(name) ?? process.env[name];
}

export function requiredEnv(name: string): string {
  const value = env(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function envFlag(name: string, fallback = false): boolean {
  const value = env(name);
  if (value === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(value.trim());
}
