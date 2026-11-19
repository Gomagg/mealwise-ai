// Defenses against prompt injection from untrusted content (user text,
// recipe content, imported data). Untrusted text is delimited and any
// instruction-override patterns are neutralized before it reaches a model.

export function sanitizeUntrusted(text: string): string {
  return text
    .slice(0, 6000)
    .replace(/```/g, "'''")
    .replace(/\b(ignore|disregard)\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts?|rules)\b/gi, "[removed]")
    .replace(/<\/?(system|assistant|developer)>/gi, "[removed]")
    .replace(/\byou are now\b/gi, "[removed]");
}
