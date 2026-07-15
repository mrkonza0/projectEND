import { Platform } from 'react-native';

/** URUSmart design-system colours */
export const C = {
  // ── Primary (header, buttons) ──────────────────
  primary:     '#2d5a3d',
  primaryDark: '#1e3d29',
  primaryMid:  '#3a7050',   // hover / pressed state

  // ── Accent (chips, badges, active states) ──────
  accent:      '#16a34a',
  accentLight: '#dcfce7',
  accentText:  '#166534',

  // ── Background ─────────────────────────────────
  bg:          '#eef7f0',   // screen background (light mint)
  bgCard:      '#ffffff',
  bgSection:   '#f4fbf5',

  // ── Text ───────────────────────────────────────
  text:        '#111827',
  textSub:     '#374151',
  textMuted:   '#6b7280',
  textLight:   '#9ca3af',

  // ── Border ─────────────────────────────────────
  border:      '#e5e7eb',
  borderLight: '#f3f4f6',

  // ── Status ─────────────────────────────────────
  error:       '#dc2626',
  errorLight:  '#fee2e2',
  warning:     '#ca8a04',
  warningLight:'#fef9c3',
  info:        '#2563eb',
  infoLight:   '#dbeafe',
};

export const Fonts = Platform.select({
  ios:  { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  web:  { sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", serif: "Georgia, serif", rounded: "'SF Pro Rounded', sans-serif", mono: "SFMono-Regular, Menlo, monospace" },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
});

// Legacy export kept for existing code
export const Colors = {
  light: { text: C.text, background: C.bg, tint: C.primary, icon: C.textMuted, tabIconDefault: C.textMuted, tabIconSelected: C.primary },
  dark:  { text: '#ECEDEE', background: '#151718', tint: '#fff', icon: '#9BA1A6', tabIconDefault: '#9BA1A6', tabIconSelected: '#fff' },
};
