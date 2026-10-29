/**
 * Formatting utilities for Indonesian currency, dates, and strings
 */

export function formatIDR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount).replace(/\s+/g, ' ');
}

/**
 * Shortened price with 'k' suffix for product cards:
 * 300000 -> "Rp 300k"
 * 250000 -> "Rp 250k"
 * 15000  -> "Rp 15k"
 * 12500  -> "Rp 12,5k"
 * < 1000 -> "Rp 950"
 */
export function formatPriceCardParts(amount: number): { prefix: string; value: string } {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return { prefix: 'Rp ', value: '0' };
  }
  if (amount >= 1000) {
    const k = amount / 1000;
    const formatted = Number.isInteger(k)
      ? k.toString()
      : (Math.round(k * 10) / 10).toString().replace('.', ',');
    return { prefix: 'Rp ', value: `${formatted}k` };
  }
  return { prefix: 'Rp ', value: amount.toString() };
}

export function formatPriceCard(amount: number): string {
  const parts = formatPriceCardParts(amount);
  return `${parts.prefix}${parts.value}`;
}

/**
 * Full price format for Product Detail (e.g. "Rp 300.000")
 */
export function formatPriceDetail(amount: number): string {
  return formatIDR(amount);
}

export function parseIDRInput(value: string): number {
  const numericOnly = value.replace(/[^0-9]/g, '');
  return numericOnly ? parseInt(numericOnly, 10) : 0;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}
