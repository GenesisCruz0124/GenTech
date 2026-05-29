export type RootStackParamList = {
  MainTabs: undefined;
  NewRepair: undefined;
  CustomerList: undefined;
  RepairDetail: { repairId: number };
  PartForm: { partId?: number };
  DeviceSaleForm: { saleId?: number };
  DevicePurchaseForm: { purchaseId?: number };
  CustomerDetail: { customerId: number };
  InvoicePreview: { invoiceId: number; type: 'repair' | 'device_sale' };
  InvoiceHistory: undefined;
  StaffList: undefined;
  StaffPerformance: { staffId?: number };
};

export type TabParamList = {
  Dashboard: undefined;
  Repairs: undefined;
  Parts: undefined;
  Devices: undefined;
  More: undefined;
};
