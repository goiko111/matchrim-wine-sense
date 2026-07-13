import type { WinerimWine } from '@/services/winerimApi';

type Currency = string | { name?: string; symbol?: string };

const currencySymbol = (currency: Currency | undefined) => {
  if (!currency) return '€';
  if (typeof currency === 'object') return currency.symbol || currency.name || '€';

  const normalized = currency.trim().toUpperCase();
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    MXN: '$',
    GBP: '£',
    CHF: 'CHF',
  };

  return symbols[normalized] || currency;
};

const formatMoney = (value: number, currency: Currency | undefined) => {
  const symbol = currencySymbol(currency);
  const amount = value.toFixed(value % 1 ? 2 : 0);
  return symbol === '€' ? `${amount}€` : `${amount} ${symbol}`;
};

const estimateRetailRange = (
  price: number,
  kind: NonNullable<WinerimWine['prices']>[number]['kind'],
) => {
  if (kind === 'glass') {
    return [price * 2.4, price * 3.6] as const;
  }

  if (kind === 'bottle') {
    return [price * 0.42, price * 0.62] as const;
  }

  return price <= 14
    ? ([price * 2.4, price * 3.6] as const)
    : ([price * 0.42, price * 0.62] as const);
};

export const getWinerimPriceDisplay = (wine: Pick<WinerimWine, 'prices'>) => {
  const price = wine.prices?.find((item) => Number.isFinite(item.price));
  if (!price) return null;

  const kindLabel = price.kind === 'glass'
    ? price.isKindInferred ? 'Copa probable' : 'Copa'
    : price.kind === 'bottle'
      ? price.isKindInferred ? 'Botella probable' : 'Botella'
      : 'Precio Winerim';

  const [minRetail, maxRetail] = estimateRetailRange(price.price, price.kind);
  const retailLabel = `${formatMoney(minRetail, price.currency)}-${formatMoney(maxRetail, price.currency)}`;

  return {
    kind: price.kind,
    kindLabel,
    restaurantPrice: formatMoney(price.price, price.currency),
    onlineEstimate: retailLabel,
    helper: price.kind === 'glass'
      ? 'Estimación de botella online calculada desde precio por copa.'
      : price.kind === 'bottle'
        ? 'Estimación online calculada desde precio de restaurante.'
        : 'Estimación orientativa: Winerim no indica si es copa o botella.',
    isKindInferred: Boolean(price.isKindInferred),
  };
};
