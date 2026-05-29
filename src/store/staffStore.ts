import { create } from 'zustand';
import {
  Staff,
  StaffPerformance,
  CreateStaffInput,
  createStaff,
  getAllStaff,
  updateStaff,
  deactivateStaff,
  getStaffPerformance,
} from '../repositories/staffRepository';

interface StaffStore {
  staff: Staff[];
  performance: StaffPerformance[];
  isLoading: boolean;

  fetchStaff: () => Promise<void>;
  fetchPerformance: () => Promise<void>;
  addStaff: (data: CreateStaffInput) => Promise<number>;
  editStaff: (id: number, data: Partial<CreateStaffInput>) => Promise<void>;
  removeStaff: (id: number) => Promise<void>;
}

export const useStaffStore = create<StaffStore>((set, get) => ({
  staff: [],
  performance: [],
  isLoading: false,

  fetchStaff: async () => {
    set({ isLoading: true });
    const staff = await getAllStaff();
    set({ staff, isLoading: false });
  },

  fetchPerformance: async () => {
    const performance = await getStaffPerformance();
    set({ performance });
  },

  addStaff: async (data) => {
    const id = await createStaff(data);
    await get().fetchStaff();
    return id;
  },

  editStaff: async (id, data) => {
    await updateStaff(id, data);
    await get().fetchStaff();
  },

  removeStaff: async (id) => {
    await deactivateStaff(id);
    set(state => ({ staff: state.staff.filter(s => s.id !== id) }));
  },
}));
