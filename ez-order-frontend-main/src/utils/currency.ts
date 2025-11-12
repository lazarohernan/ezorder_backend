const currencyFormatter = new Intl.NumberFormat('es-HN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true
});

export const formatCurrencyHNL = (value: number = 0): string => {
  const numericValue = Number(value);
  const amount = Number.isFinite(numericValue) ? numericValue : 0;
  const sign = amount < 0 ? '-' : '';
  return `${sign}Lp. ${currencyFormatter.format(Math.abs(amount))}`;
};

export const formatCurrencyHNLWithSign = (value: number = 0): string => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue === 0) {
    return 'Lp. 0.00';
  }

  const sign = numericValue > 0 ? '+Lp. ' : '-Lp. ';
  return `${sign}${currencyFormatter.format(Math.abs(numericValue))}`;
};
