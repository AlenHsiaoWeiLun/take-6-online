export interface Character {
  id: string;
  name: string;
  tagline: string;
  plus?: boolean;
  /** Palette used by the SVG fallback portrait. */
  colors: { hide: string; snout: string; horn: string; accent: string };
  accessory: 'none' | 'flower' | 'bandana' | 'glasses' | 'ring' | 'crown' | 'headphones' | 'star' | 'scarf' | 'visor';
}

export const CHARACTERS: Character[] = [
  { id: 'bruno', name: 'Bruno', tagline: 'Charges first, counts later.', colors: { hide: '#C8553D', snout: '#F4C7A1', horn: '#FFF4DE', accent: '#1F2A44' }, accessory: 'ring' },
  { id: 'daisy', name: 'Daisy', tagline: 'Sweet smile, sharp memory.', colors: { hide: '#F2E6D8', snout: '#F6B8B0', horn: '#E9D3A6', accent: '#F5B942' }, accessory: 'flower' },
  { id: 'tank', name: 'Tank', tagline: 'Takes rows so you don’t have to.', colors: { hide: '#5B4636', snout: '#C79A7A', horn: '#F3E7CF', accent: '#E5484D' }, accessory: 'bandana' },
  { id: 'mocha', name: 'Mocha', tagline: 'Calm under a pile of bullheads.', colors: { hide: '#8A5A3C', snout: '#E7C3A0', horn: '#FFF1D6', accent: '#4F8A8B' }, accessory: 'scarf' },
  { id: 'ziggy', name: 'Ziggy', tagline: 'Plays the 55 just to watch.', colors: { hide: '#6E5BD6', snout: '#C9BDFB', horn: '#FFE7A8', accent: '#F5B942' }, accessory: 'star' },
  { id: 'nova', name: 'Nova', tagline: 'Counts every card. Every one.', colors: { hide: '#2E3A59', snout: '#9FB3D9', horn: '#F0E6D0', accent: '#5AC8FA' }, accessory: 'glasses' },
  { id: 'sage', name: 'Sage', tagline: 'Never met a low card she liked.', colors: { hide: '#6F8F5E', snout: '#D6E3B5', horn: '#FFF3D9', accent: '#C8553D' }, accessory: 'none' },
  { id: 'bolt', name: 'Bolt', tagline: 'Plays fast, regrets faster.', colors: { hide: '#E0A43A', snout: '#FFE3A8', horn: '#FFFFFF', accent: '#1F2A44' }, accessory: 'headphones' },
  { id: 'aurum', name: 'Aurum', tagline: 'Plus exclusive. Solid gold.', plus: true, colors: { hide: '#D9A937', snout: '#FFE9A6', horn: '#FFFBEA', accent: '#8A5A12' }, accessory: 'crown' },
  { id: 'nebula', name: 'Nebula', tagline: 'Plus exclusive. From beyond the barn.', plus: true, colors: { hide: '#1B1740', snout: '#8E7CF0', horn: '#E6DDFF', accent: '#FF7AC6' }, accessory: 'visor' },
];

export const BOT_CHARACTER_IDS = CHARACTERS.filter((c) => !c.plus).map((c) => c.id);

export interface CardTheme {
  id: string;
  name: string;
  description: string;
  plus?: boolean;
}

export const CARD_THEMES: CardTheme[] = [
  { id: 'classic', name: 'Classic', description: 'Cream stock, colour-coded by bullheads.' },
  { id: 'midnight', name: 'Midnight', description: 'Ink-black faces with neon penalty bands.', plus: true },
  { id: 'gilded', name: 'Gilded', description: 'Foil-edged ivory with gold bullheads.', plus: true },
  { id: 'meadow', name: 'Meadow', description: 'Soft greens, hand-drawn pasture pattern.', plus: true },
];

export const EMOTES = [
  { id: 'gg', label: 'GG' },
  { id: 'nice', label: 'Nice one' },
  { id: 'oops', label: 'Oops' },
  { id: 'wow', label: 'Wow' },
  { id: 'hurry', label: 'Hurry up!' },
  { id: 'moo', label: 'Moo!' },
] as const;

export const BOT_NAMES = [
  'Moo-bot', 'Hayley', 'Sir Loin', 'Brisket', 'Clover', 'Hornsby',
  'Buttercup', 'Rancher', 'T-Bone', 'Dandelion', 'Maverick', 'Pasture Pete',
];

export const isCharacterAllowed = (id: string, isPlus: boolean) => {
  const c = CHARACTERS.find((x) => x.id === id);
  return !!c && (!c.plus || isPlus);
};

export const isThemeAllowed = (id: string, isPlus: boolean) => {
  const t = CARD_THEMES.find((x) => x.id === id);
  return !!t && (!t.plus || isPlus);
};
