export const CATEGORY_LABELS: Record<string, string> = {
  food: 'Alimentation',
  fashion: 'Mode',
  electronics: 'Électronique',
  health: 'Santé',
  home: 'Maison',
  beauty: 'Beauté',
  services: 'Services',
  service: 'Services',
  pharmacy: 'Pharmacie',
  shop: 'Boutique générale',
  artisan: 'Artisan',
  other: 'Autre',
};

export const getCategoryLabel = (category?: string | null) => {
  if (!category) return 'Boutique';
  return CATEGORY_LABELS[category.toLowerCase()] || category;
};

export const CATEGORY_EMOJIS: Record<string, string> = {
  food: '🍽️',
  fashion: '👗',
  electronics: '📱',
  health: '💊',
  home: '🏠',
  beauty: '💄',
  services: '🔧',
  shop: '🛍️',
  artisan: '🎨',
};

export const getCategoryEmoji = (category?: string | null) => {
  if (!category) return '🛍️';
  return CATEGORY_EMOJIS[category.toLowerCase()] || '🛍️';
};

export const CATEGORY_GRADIENTS: Record<string, string> = {
  food: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  fashion: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
  electronics: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
  health: 'linear-gradient(135deg, #00A86B 0%, #0A504A 100%)',
  home: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
  beauty: 'linear-gradient(135deg, #db2777 0%, #ec4899 100%)',
  services: 'linear-gradient(135deg, #ca8a04 0%, #d97706 100%)',
  service: 'linear-gradient(135deg, #ca8a04 0%, #d97706 100%)',
};

const DEFAULT_GRADIENTS = [
  'linear-gradient(135deg, #00A86B 0%, #0A504A 100%)',
  'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #ca8a04 0%, #f59e0b 100%)',
  'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
  'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
];

export const getCategoryGradient = (category: string, id: string) => {
  const key = category?.toLowerCase();
  if (key && CATEGORY_GRADIENTS[key]) return CATEGORY_GRADIENTS[key];
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return DEFAULT_GRADIENTS[hash % DEFAULT_GRADIENTS.length];
};

const SHOP_BANNER_CATEGORY_STYLES: Record<string, string> = {
  food: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)',
  fashion: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)',
  electronics: 'linear-gradient(135deg, #1e3a8a 0%, #0369a1 100%)',
  health: 'linear-gradient(135deg, #0A504A 0%, #00A86B 100%)',
  home: 'linear-gradient(135deg, #134e4a 0%, #0f766e 100%)',
  beauty: 'linear-gradient(135deg, #9d174d 0%, #db2777 100%)',
  services: 'linear-gradient(135deg, #78350f 0%, #ca8a04 100%)',
  service: 'linear-gradient(135deg, #78350f 0%, #ca8a04 100%)',
  pharmacy: 'linear-gradient(135deg, #0A504A 0%, #00A86B 100%)',
  artisan: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)',
};

const SHOP_BANNER_DEFAULTS = [
  'linear-gradient(135deg, #0A504A 0%, #00A86B 100%)',
  'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #713f12 0%, #ca8a04 100%)',
  'linear-gradient(135deg, #134e4a 0%, #0f766e 100%)',
  'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
];

export const getShopBannerStyle = (category: string, index: number) => {
  const key = category?.toLowerCase();
  if (key && SHOP_BANNER_CATEGORY_STYLES[key]) return SHOP_BANNER_CATEGORY_STYLES[key];
  return SHOP_BANNER_DEFAULTS[index % SHOP_BANNER_DEFAULTS.length];
};
