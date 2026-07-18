// Shared catalog of the LLM models the Tutor can run on. The end user does NOT
// choose the model anymore — it's a product decision made by the admin from the
// admin dashboard (stored server-side in public.app_settings.active_model and
// enforced by the coach-proxy edge function). This catalog is the single source
// of truth for the dashboard picker's options; keep it in sync with the
// coach-proxy's ALLOWED_MODELS allowlist.

export interface TutorModel {
  id: string;
  label: string;
  provider: string;
  /** 'free' models cost $0 on OpenRouter (but can be rate-limited/overloaded);
   *  'paid' models cost real money and should be chosen deliberately. */
  tier: 'free' | 'paid';
  note?: string;
}

export const TUTOR_MODELS: TutorModel[] = [
  // Paid — cost real money, chosen for quality/reliability.
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', provider: 'OpenAI', tier: 'paid', note: 'Barato, rápido e confiável' },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'Google', tier: 'paid', note: 'Mais capaz · contexto enorme' },
  { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', provider: 'Google', tier: 'paid', note: 'Muito barato · rápido' },
  { id: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash', provider: 'DeepSeek', tier: 'paid', note: 'O mais barato · forte no raciocínio' },
  // Free — $0, mas podem ficar sobrecarregados / na fila.
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B', provider: 'Meta', tier: 'free', note: 'Grátis · pode sobrecarregar' },
  { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1', provider: 'DeepSeek', tier: 'free', note: 'Grátis · raciocínio avançado' },
  { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B', provider: 'Google', tier: 'free', note: 'Grátis · rápido e capaz' },
  { id: 'qwen/qwq-32b:free', label: 'QwQ 32B', provider: 'Alibaba', tier: 'free', note: 'Grátis · raciocínio passo a passo' },
  { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B', provider: 'Mistral', tier: 'free', note: 'Grátis · leve e rápido' },
];

// Fallback used when the server hasn't set an active model yet (or on the legacy
// bring-your-own-key path, where there's no app_settings to read).
export const DEFAULT_ACTIVE_MODEL = 'deepseek/deepseek-v4-flash';

// Key of the row in public.app_settings that holds the active model id.
export const ACTIVE_MODEL_SETTING_KEY = 'active_model';

export function getModelById(id: string): TutorModel | undefined {
  return TUTOR_MODELS.find((m) => m.id === id);
}

export function getModelLabel(id: string): string {
  return getModelById(id)?.label ?? id;
}
