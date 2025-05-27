export const currencyDecimals: Record<string, number> = {
      // Crypto currencies
      USDC: 6,
      SOL: 9,
      // Fiat currencies
      USD: 2,
      EUR: 2,
      NGN: 2,
} as const;

export function convertToDecimalPrecision(amount: number, currency: string): string {
      const decimals = currencyDecimals[currency];

      if (decimals === undefined) {
            throw new Error(`Unknown currency: ${currency}`);
      }

      return Math.round(amount * Math.pow(10, decimals)).toString();
}

