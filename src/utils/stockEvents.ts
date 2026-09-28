export const STOCK_UPDATED_EVENT = 'stockmaster:stock-updated';

export function notifyStockUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STOCK_UPDATED_EVENT));
  }
}
