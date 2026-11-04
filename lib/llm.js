// Необязательно: если задан ANTHROPIC_API_KEY, помощник отвечает на нестандартные
// вопросы через языковую модель — строго по переданным фактам студии.
// Без ключа всё работает на встроенных правилах.
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ASSISTANT_MODEL || 'claude-haiku-5-5';

export const llmEnabled = () => !!KEY;

const SYSTEM = {
  client: 'Ты — вежливый помощник автосервиса/детейлинг-студии. Отвечай по-русски, коротко (до 3 предложений), только по фактам ниже. Не выдумывай цены, время и услуги. Если фактов не хватает — задай один уточняющий вопрос или предложи позвонить. Не используй markdown-заголовки.',
  owner: 'Ты — помощник владельца студии. Отвечай по-русски, коротко, только по данным ниже (это выгрузка из базы). Если данных не хватает — так и скажи и предложи уточнить период.',
};

export async function askLlm(facts, question, role = 'client') {
  if (!KEY) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 400,
        system: `${SYSTEM[role]}\n\nФакты:\n${facts}`,
        messages: [{ role: 'user', content: String(question).slice(0, 500) }],
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim() || null;
  } catch { return null; } finally { clearTimeout(timer); }
}
