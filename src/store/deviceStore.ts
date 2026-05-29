import { create } from 'zustand';
import {
  DeviceSale,
  CreateDeviceSaleInput,
  getAllDeviceSales,
  createDeviceSale,
  deleteDeviceSale,
} from '../repositories/deviceSaleRepository';
import {
  DevicePurchase,
  CreateDevicePurchaseInput,
  getAllDevicePurchases,
  createDevicePurchase,
  deleteDevicePurchase,
} from '../repositories/devicePurchaseRepository';

interface DeviceStore {
  sales: DeviceSale[];
  purchases: DevicePurchase[];
  isLoading: boolean;

  fetchSales: () => Promise<void>;
  fetchPurchases: () => Promise<void>;
  addSale: (data: CreateDeviceSaleInput) => Promise<number>;
  addPurchase: (data: CreateDevicePurchaseInput) => Promise<number>;
  removeSale: (id: number) => Promise<void>;
  removePurchase: (id: number) => Promise<void>;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  sales: [],
  purchases: [],
  isLoading: false,

  fetchSales: async () => {
    set({ isLoading: true });
    const sales = await getAllDeviceSales();
    set({ sales, isLoading: false });
  },

  fetchPurchases: async () => {
    set({ isLoading: true });
    const purchases = await getAllDevicePurchases();
    set({ purchases, isLoading: false });
  },

  addSale: async (data) => {
    const id = await createDeviceSale(data);
    await get().fetchSales();
    return id;
  },

  addPurchase: async (data) => {
    const id = await createDevicePurchase(data);
    await get().fetchPurchases();
    return id;
  },

  removeSale: async (id) => {
    await deleteDeviceSale(id);
    set(state => ({ sales: state.sales.filter(s => s.id !== id) }));
  },

  removePurchase: async (id) => {
    await deleteDevicePurchase(id);
    set(state => ({ purchases: state.purchases.filter(p => p.id !== id) }));
  },
}));
