import { create } from 'zustand';

// Module-level flag: set when a repair is created so RepairsListScreen clears stale filters
export let repairJustCreated = false;
export function consumeRepairJustCreated(): boolean {
  const val = repairJustCreated;
  repairJustCreated = false;
  return val;
}
import {
  RepairWithCustomer,
  CreateRepairInput,
  RepairFilter,
  createRepair,
  listRepairs,
  getRepairById,
  updateRepairStatus,
  updateRepair,
  deleteRepair,
  getStatusCounts,
  getNotPaidCount,
  addRepairNote,
  getRepairNotes,
  markNotRepaired,
  deliverRepair,
} from '../repositories/repairRepository';
import { RepairStatus } from '../constants/statusOptions';

interface RepairStore {
  repairs: RepairWithCustomer[];
  statusCounts: Record<RepairStatus, number>;
  notPaidCount: number;
  isLoading: boolean;
  error: string | null;

  fetchRepairs: (filter?: RepairFilter) => Promise<void>;
  fetchStatusCounts: (dateFrom?: string, dateTo?: string) => Promise<void>;
  addRepair: (data: CreateRepairInput) => Promise<number>;
  advanceStatus: (id: number, status: RepairStatus) => Promise<void>;
  setNotRepaired: (id: number) => Promise<void>;
  deliver: (id: number, isPaid: boolean) => Promise<void>;
  editRepair: (id: number, data: Parameters<typeof updateRepair>[1]) => Promise<void>;
  removeRepair: (id: number) => Promise<void>;
  addNote: (repairId: number, content: string, staffId?: number) => Promise<void>;
  getNotes: (repairId: number) => Promise<ReturnType<typeof getRepairNotes>>;
}

export const useRepairStore = create<RepairStore>((set, get) => ({
  repairs: [],
  statusCounts: { pending: 0, in_progress: 0, ready: 0, delivered: 0, not_repaired: 0 },
  notPaidCount: 0,
  isLoading: false,
  error: null,

  fetchRepairs: async (filter) => {
    set({ isLoading: true, error: null });
    try {
      const repairs = await listRepairs(filter);
      set({ repairs, isLoading: false });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  fetchStatusCounts: async (dateFrom?: string, dateTo?: string) => {
    const [counts, notPaidCount] = await Promise.all([getStatusCounts(dateFrom, dateTo), getNotPaidCount(dateFrom, dateTo)]);
    set({ statusCounts: counts, notPaidCount });
  },

  addRepair: async (data) => {
    const id = await createRepair(data);
    repairJustCreated = true;
    await get().fetchRepairs();
    await get().fetchStatusCounts();
    return id;
  },

  advanceStatus: async (id, status) => {
    await updateRepairStatus(id, status);
    await get().fetchRepairs();
    await get().fetchStatusCounts();
  },

  setNotRepaired: async (id) => {
    await markNotRepaired(id);
    await get().fetchRepairs();
    await get().fetchStatusCounts();
  },

  deliver: async (id, isPaid) => {
    await deliverRepair(id, isPaid);
    await get().fetchRepairs();
    await get().fetchStatusCounts();
  },

  editRepair: async (id, data) => {
    await updateRepair(id, data);
    await get().fetchRepairs();
  },

  removeRepair: async (id) => {
    await deleteRepair(id);
    set(state => ({ repairs: state.repairs.filter(r => r.id !== id) }));
    await get().fetchStatusCounts();
  },

  addNote: async (repairId, content, staffId) => {
    await addRepairNote(repairId, content, staffId);
  },

  getNotes: async (repairId) => {
    return getRepairNotes(repairId);
  },
}));
