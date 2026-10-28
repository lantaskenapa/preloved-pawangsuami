import React from 'react';
import {
  Gamepad2,
  Shirt,
  Tv,
  Watch,
  Smartphone,
  Package,
  Tag,
  Headphones,
  Laptop,
  Camera,
  Layers,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

export function getCategoryIcon(iconName?: string, className = 'w-4 h-4'): React.ReactElement {
  const norm = (iconName || '').toLowerCase().trim();

  switch (norm) {
    case 'gamepad2':
    case 'gamepad':
    case 'games':
      return <Gamepad2 className={className} />;
    case 'shirt':
    case 'shirts':
    case 'clothes':
      return <Shirt className={className} />;
    case 'tv':
    case 'electronics':
      return <Tv className={className} />;
    case 'watch':
    case 'accessories':
      return <Watch className={className} />;
    case 'smartphone':
    case 'gadgets':
    case 'gadget':
      return <Smartphone className={className} />;
    case 'headphones':
      return <Headphones className={className} />;
    case 'laptop':
      return <Laptop className={className} />;
    case 'camera':
      return <Camera className={className} />;
    case 'package':
    case 'others':
      return <Package className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'bag':
    case 'shoppingbag':
      return <ShoppingBag className={className} />;
    default:
      return <Tag className={className} />;
  }
}
