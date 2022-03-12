export * from './receiver';
export * from './sender';

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
