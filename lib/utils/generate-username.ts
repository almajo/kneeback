const WORDS = [
  "flexion",
  "meniscus",
  "patella",
  "ligament",
  "hamstring",
  "tendon",
  "cartilage",
  "femur",
  "tibia",
  "graft",
];

export function generateUsername(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${word}${num}`;
}
