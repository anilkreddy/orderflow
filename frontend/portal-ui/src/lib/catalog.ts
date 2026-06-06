import type { Product } from '../types';

export interface Department {
  key: string;
  label: string;
  blurb: string;
}

export const departments: Department[] = [
  { key: 'electronics', label: 'Electronics', blurb: 'Devices, audio, and connected home tech.' },
  { key: 'computers-accessories', label: 'Computers & Accessories', blurb: 'Laptops, displays, and desk hardware.' },
  { key: 'home-kitchen', label: 'Home & Kitchen', blurb: 'Practical upgrades for everyday living.' },
  { key: 'grocery-gourmet', label: 'Grocery & Gourmet', blurb: 'Pantry staples and premium consumables.' },
  { key: 'fashion', label: 'Fashion', blurb: 'Everyday apparel, footwear, and carry goods.' },
  { key: 'beauty-personal-care', label: 'Beauty & Personal Care', blurb: 'Routine essentials and wellness basics.' },
  { key: 'sports-outdoors', label: 'Sports & Outdoors', blurb: 'Training gear and outdoor-ready picks.' },
  { key: 'toys-games', label: 'Toys & Games', blurb: 'Play, puzzles, and family entertainment.' },
  { key: 'books-stationery', label: 'Books & Stationery', blurb: 'Planning, note-taking, and desk supplies.' },
  { key: 'pet-supplies', label: 'Pet Supplies', blurb: 'Comfort, feeding, and everyday pet care.' },
];

export function getDepartmentForProduct(product: Product) {
  const categoryCode = product.categoryCode?.trim().toLowerCase();
  if (categoryCode) {
    const matchedDepartment = departments.find((department) => department.key === categoryCode);
    if (matchedDepartment) {
      return matchedDepartment;
    }
  }

  const categoryName = product.categoryName?.trim().toLowerCase();
  if (categoryName) {
    const matchedDepartment = departments.find((department) => department.label.toLowerCase() === categoryName);
    if (matchedDepartment) {
      return matchedDepartment;
    }
  }

  return departments[(product.id - 1) % departments.length];
}

export function getLeadBadge(product: Product) {
  if (product.stockQuantity === 0) {
    return 'Sold out';
  }

  if (product.stockQuantity <= 5) {
    return 'Limited stock';
  }

  if (product.price >= 150) {
    return 'Premium pick';
  }

  if (product.price <= 35) {
    return 'Everyday value';
  }

  return 'Customer favorite';
}

export function getShippingNote(product: Product) {
  if (product.stockQuantity >= 20) {
    return 'Fast dispatch available';
  }

  if (product.stockQuantity >= 8) {
    return 'Ships from store inventory';
  }

  if (product.stockQuantity > 0) {
    return 'Popular item, order soon';
  }

  return 'Restock required';
}

export function getFeatureHighlights(product: Product) {
  return [
    `${getDepartmentForProduct(product).label} assortment`,
    `${product.stockQuantity > 0 ? `${product.stockQuantity} units in inventory` : 'Currently unavailable'}`,
    `${product.price >= 120 ? 'High-consideration item' : 'Easy add-on for larger baskets'}`,
  ];
}

export function getReviewSnapshot(product: Product) {
  const rating = Math.min(5, 4.1 + ((product.id % 9) * 0.08));
  const reviews = 120 + product.id * 17;

  return {
    rating: Number(rating.toFixed(1)),
    reviews,
  };
}

export function getMerchandisingSignals(product: Product) {
  const department = getDepartmentForProduct(product);

  return [
    `${department.label} favorite`,
    product.stockQuantity >= 20 ? 'Fast-moving inventory' : 'Selective availability',
    product.price >= 150 ? 'Higher-consideration purchase' : 'Easy basket add-on',
  ];
}
