import { create } from 'zustand';
import { ReportPeriod } from '../repositories/reportsRepository';

interface FilterStore {
  period: ReportPeriod;
  targetDate: Date;
  setPeriod: (period: ReportPeriod) => void;
  setTargetDate: (date: Date) => void;
  getTargetDateIso: () => string | undefined;
}

export const useFilterStore = create<FilterStore>((set, get) => ({
  period: 'monthly',
  targetDate: new Date(),

  setPeriod: (period) => set({ period, targetDate: new Date() }),
  setTargetDate: (targetDate) => set({ targetDate }),

  getTargetDateIso: () => {
    const { period, targetDate } = get();
    if (period === 'all_time') return undefined;
    return targetDate.toISOString().split('T')[0];
  },
}));
