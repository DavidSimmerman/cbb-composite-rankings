export const TABS = ['overview', 'stats', 'schedule', 'history', 'march'] as const;
export type Tab = (typeof TABS)[number];
