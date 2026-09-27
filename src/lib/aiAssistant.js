/** Broadcast name any header/menu button can use to open the assistant. */
export const AI_OPEN_EVENT = 'open-ai-assistant';

export function openAIAssistant() {
  window.dispatchEvent(new CustomEvent(AI_OPEN_EVENT));
}
