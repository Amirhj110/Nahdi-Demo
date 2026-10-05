export interface Product {
  id: string;
  name: string;
  arabicName: string;
  brand: string;
  category: 'Skincare' | 'Sunscreen' | 'Serums' | 'Hydration' | 'Cleansers' | 'Cosmetics';
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  volume: string;
  badge: string;
  badgeColor?: string;
  tagline: string;
  description: string;
  activeIngredients: string[];
  skinType: string;
  imageBg: string;
  accentColor: string;
  imageUrl: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isError?: boolean;
}
