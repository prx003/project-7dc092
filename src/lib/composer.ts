export const FILTERS = [
  { id: "normal", label: "Normal", css: "none" },
  { id: "clarendon", label: "Clarendon", css: "contrast(1.2) saturate(1.35)" },
  { id: "gingham", label: "Gingham", css: "brightness(1.05) hue-rotate(-10deg) sepia(0.15)" },
  { id: "moon", label: "Moon", css: "grayscale(1) contrast(1.1) brightness(1.1)" },
  { id: "lark", label: "Lark", css: "contrast(0.9) saturate(1.2) brightness(1.1)" },
  { id: "reyes", label: "Reyes", css: "sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)" },
  { id: "juno", label: "Juno", css: "saturate(1.4) contrast(1.1) sepia(0.1)" },
  { id: "slumber", label: "Slumber", css: "saturate(0.66) brightness(1.05) sepia(0.2)" },
  { id: "aden", label: "Aden", css: "hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)" },
] as const;

export const ASPECTS = [
  { id: "1/1", label: "1:1" },
  { id: "4/5", label: "4:5" },
  { id: "16/9", label: "16:9" },
  { id: "original", label: "Original" },
] as const;

export const TRACKS = [
  { title: "Golden Hour", artist: "JVKE" },
  { title: "Kesariya", artist: "Arijit Singh" },
  { title: "Calm Down", artist: "Rema, Selena Gomez" },
  { title: "Flowers", artist: "Miley Cyrus" },
  { title: "Apna Bana Le", artist: "Arijit Singh" },
  { title: "Espresso", artist: "Sabrina Carpenter" },
  { title: "Heeriye", artist: "Jasleen Royal, Arijit Singh" },
  { title: "Blinding Lights", artist: "The Weeknd" },
  { title: "Naatu Naatu", artist: "Rahul Sipligunj" },
  { title: "Levitating", artist: "Dua Lipa" },
];

export const AUDIENCES = [
  { id: "everyone", label: "Everyone", hint: "Anyone on SAC can see this" },
  { id: "connections", label: "Connections", hint: "Only people you're connected with" },
  { id: "close_friends", label: "Close friends", hint: "Only your close friends list" },
] as const;

export function filterCss(id: string | null | undefined, adj?: { brightness: number; contrast: number; saturate: number }) {
  const base = FILTERS.find((f) => f.id === id)?.css ?? "none";
  const extra = adj ? `brightness(${adj.brightness}) contrast(${adj.contrast}) saturate(${adj.saturate})` : "";
  return [base === "none" ? "" : base, extra].join(" ").trim() || "none";
}
