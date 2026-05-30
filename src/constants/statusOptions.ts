export type RepairStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'not_repaired';

export const STATUS_LABELS: Record<RepairStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  ready: 'Ready to Pickup',
  delivered: 'Delivered',
  not_repaired: 'Not Repaired',
};

export const STATUS_FLOW: RepairStatus[] = ['pending', 'in_progress', 'ready', 'delivered'];

export const STATUS_NEXT: Record<RepairStatus, RepairStatus | null> = {
  pending: 'in_progress',
  in_progress: 'ready',
  ready: 'delivered',
  delivered: null,
  not_repaired: null,
};

export const STATUS_COLORS: Record<RepairStatus, string> = {
  pending: '#FF6F00',
  in_progress: '#1976D2',
  ready: '#388E3C',
  delivered: '#757575',
  not_repaired: '#D32F2F',
};
