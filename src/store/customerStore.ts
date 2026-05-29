import { create } from 'zustand';
import {
  Customer,
  CreateCustomerInput,
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  upsertCustomerByPhone,
} from '../repositories/customerRepository';

interface CustomerStore {
  customers: Customer[];
  isLoading: boolean;

  fetchCustomers: () => Promise<void>;
  addCustomer: (data: CreateCustomerInput) => Promise<number>;
  upsertByPhone: (data: CreateCustomerInput) => Promise<number>;
  editCustomer: (id: number, data: Partial<CreateCustomerInput>) => Promise<void>;
  removeCustomer: (id: number) => Promise<void>;
  getById: (id: number) => Promise<Customer | null>;
}

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  customers: [],
  isLoading: false,

  fetchCustomers: async () => {
    set({ isLoading: true });
    const customers = await getAllCustomers();
    set({ customers, isLoading: false });
  },

  addCustomer: async (data) => {
    const id = await createCustomer(data);
    await get().fetchCustomers();
    return id;
  },

  upsertByPhone: async (data) => {
    const id = await upsertCustomerByPhone(data);
    await get().fetchCustomers();
    return id;
  },

  editCustomer: async (id, data) => {
    await updateCustomer(id, data);
    await get().fetchCustomers();
  },

  removeCustomer: async (id) => {
    await deleteCustomer(id);
    set(state => ({ customers: state.customers.filter(c => c.id !== id) }));
  },

  getById: async (id) => {
    return getCustomerById(id);
  },
}));
