const BLOCKED_PATTERNS: RegExp[] = [
  // Spam / self-promotion
  /\b(buy now|click here|free money|make money fast|earn \$|limited offer|act now|order now)\b/i,
  // Hate speech
  /\b(nigger|faggot|kike|spic|chink|cunt)\b/i,
  // Explicit content
  /\b(porn|pornography|xxx|nude|naked|sex tape)\b/i,
  // Phone/email harvesting
  /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/,
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/,
  // URLs (discourage off-site links in community)
  /https?:\/\/(?!kneeback\.app)/i,
];

export function moderateContent(text: string): { blocked: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { blocked: true, reason: "Your post contains content that isn't allowed in this community." };
    }
  }
  return { blocked: false };
}
