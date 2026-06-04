export type RootStackParamList = {
  MainTabs: undefined;
  NewRepair: { customerName?: string; customerPhone?: string; deviceModel?: string; initialIssue?: string } | undefined;
  CustomerList: undefined;
  RepairDetail: { repairId: number };
  PartForm: { partId?: number };
  Restock: { partId: number; partName: string; costPrice: number };
  CustomerDetail: { customerId: number };
  InvoicePreview: { invoiceId: number; type: 'repair' | 'device_sale' };
  InvoiceHistory: undefined;
  CategoryList: undefined;
  DeviceBrandList: undefined;
  DeviceModelList: undefined;
  IssueList: undefined;
  ShopInfo: undefined;
  Backup: undefined;
  StaffList: undefined;
  StaffPerformance: { staffId?: number };
  SupplierDetail: { supplierId: number };
  CoTechDetail: { coTechId: number };
};

export type TabParamList = {
  Dashboard: undefined;
  Customers: undefined;
  Repairs: { initialFilter?: string } | undefined;
  Parts: undefined;
  Suppliers: undefined;
  CoTech: undefined;
  More: undefined;
};
