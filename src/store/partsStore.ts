import { create } from 'zustand';
import {
  Part,
  CreatePartInput,
  createPart,
  getAllParts,
  getPartById,
  updatePart,
  deletePart,
  getLowStockParts,
  addRepairPart,
  getRepairParts,
  removeRepairPart,
  recordPartsPurchase,
  updatePartsPurchaseStatus,
  RestockStatus,
} from '../repositories/partsRepository';

interface PartsStore {
  parts: Part[];
  lowStockParts: Part[];
  isLoading: boolean;

  fetchParts: () => Promise<void>;
  fetchLowStock: () => Promise<void>;
  addPart: (data: CreatePartInput) => Promise<number>;
  editPart: (id: number, data: Partial<CreatePartInput>) => Promise<void>;
  removePart: (id: number) => Promise<void>;
  addToRepair: (repairId: number, partId: number, quantity: number, unitPrice: number, actualCost?: number) => Promise<void>;
  getForRepair: (repairId: number) => Promise<ReturnType<typeof getRepairParts>>;
  removeFromRepair: (repairPartId: number, partId: number, quantity: number) => Promise<void>;
  bulkRestock: (
    items: { part_id: number; quantity: number; cost_price: number }[],
    shared: { supplier_name?: string; notes?: string; image_uri?: string; purchased_at?: string; status?: RestockStatus }
  ) => Promise<void>;
  setRestockStatus: (purchaseId: number, status: RestockStatus) => Promise<void>;
}

export const usePartsStore = create<PartsStore>((set, get) => ({
  parts: [],
  lowStockParts: [],
  isLoading: false,

  fetchParts: async () => {
    set({ isLoading: true });
    const parts = await getAllParts();
    set({ parts, isLoading: false });
  },

  fetchLowStock: async () => {
    const lowStockParts = await getLowStockParts();
    set({ lowStockParts });
  },

  addPart: async (data) => {
    const id = await createPart(data);
    await get().fetchParts();
    return id;
  },

  editPart: async (id, data) => {
    await updatePart(id, data);
    await get().fetchParts();
  },

  removePart: async (id) => {
    await deletePart(id);
    set(state => ({ parts: state.parts.filter(p => p.id !== id) }));
  },

  addToRepair: async (repairId, partId, quantity, unitPrice, actualCost = 0) => {
    await addRepairPart(repairId, partId, quantity, unitPrice, actualCost);
    await get().fetchParts();
  },

  getForRepair: async (repairId) => {
    return getRepairParts(repairId);
  },

  removeFromRepair: async (repairPartId, partId, quantity) => {
    await removeRepairPart(repairPartId, partId, quantity);
    await get().fetchParts();
  },

  bulkRestock: async (items, shared) => {
    for (const item of items) {
      await recordPartsPurchase({
        part_id: item.part_id,
        quantity: item.quantity,
        cost_price: item.cost_price,
        supplier_name: shared.supplier_name,
        notes: shared.notes,
        image_uri: shared.image_uri,
        purchased_at: shared.purchased_at,
        status: shared.status,
      });
    }
    await get().fetchParts();
  },

  setRestockStatus: async (purchaseId, status) => {
    await updatePartsPurchaseStatus(purchaseId, status);
    await get().fetchParts();
  },
}));
