import { request } from './api';

export type AppLanguage = 'km' | 'en';
export type AppTheme = 'light' | 'dark';
export type PrimaryCurrency = 'KHR' | 'USD';

export interface AppSettings {
  language: AppLanguage;
  theme: AppTheme;
  notify_new_order: boolean;
  notify_low_stock: boolean;
  notify_payment_done: boolean;
  currency: PrimaryCurrency;
  exchange_rate: number;
}

export type AppSettingsPatch = Partial<Omit<AppSettings, 'exchange_rate'>> & {
  exchange_rate?: number;
};

export const settingsApi = {
  get: () =>
    request<AppSettings>('/settings').then((s) => ({ ...s, exchange_rate: Number(s.exchange_rate) })),

  update: (patch: AppSettingsPatch) =>
    request<AppSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(patch),
    }).then((s) => ({ ...s, exchange_rate: Number(s.exchange_rate) })),
};