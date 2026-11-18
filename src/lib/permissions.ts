export const ORDER_STATUSES = ['new', 'agreed', 'in_progress', 'ready', 'completed', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новый',
  agreed: 'Подтверждён',
  in_progress: 'В боксе',
  ready: 'Готов к выдаче',
  completed: 'Выполнен',
  cancelled: 'Отменён',
};

/** Мастер видит заказы только после подтверждения админом и до выдачи. */
export const MASTER_VISIBLE_STATUSES: string[] = ['agreed', 'in_progress', 'ready'];

/** where-условие для списка заказов мастера: свободные + его собственные. */
export function masterOrderWhere(userId: string) {
  return {
    status: { in: MASTER_VISIBLE_STATUSES },
    OR: [{ assignedMasterId: null }, { assignedMasterId: userId }],
  };
}

export function canMasterSeeOrder(
  order: { status: string; assignedMasterId: string | null },
  userId: string
): boolean {
  return (
    MASTER_VISIBLE_STATUSES.includes(order.status) &&
    (order.assignedMasterId === null || order.assignedMasterId === userId)
  );
}

/** Единственные переходы статуса, которые разрешены мастеру (и только на своём заказе). */
export const MASTER_TRANSITIONS: ReadonlyArray<{ from: OrderStatus; to: OrderStatus }> = [
  { from: 'in_progress', to: 'ready' },
  { from: 'ready', to: 'in_progress' },
];

export interface OrderRow {
  id: string;
  status: string;
  createdAt: Date;
  clientName: string;
  clientPhone: string;
  carBrandModel: string;
  carLicensePlate: string | null;
  carVin: string | null;
  carClass: string;
  isDirty: boolean;
  serviceFormat: string;
  deliveryAddress: string | null;
  desiredDate: string | null;
  desiredTime: string | null;
  agreedEntryDateTime: string | null;
  clientComment: string | null;
  itemsJson: string;
  photosJson: string;
  mileage: number | null;
  fuelLevel: number | null;
  damagesJson: string;
  inspectionPhotosBeforeJson: string;
  inspectionPhotosAfterJson: string;
  actCompletedAt: Date | null;
  assignedMasterId: string | null;
  assignedMasterName: string | null;
  workStartedAt: Date | null;
  masterPayoutRub: number;
  booking?: { workbay?: { name: string } | null } | null;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface ItemLike {
  name?: string;
  quantity?: number;
  category?: string;
  zones?: string[];
}

/**
 * Что видит МАСТЕР — это белый список (allowlist), а не «всё минус финансы».
 * Новое поле в Order по умолчанию мастеру НЕ утекает.
 * Не попадают: цены и итоги, себестоимость, процент и выплаты (кроме собственной),
 * чистая прибыль, способ оплаты, приватная заметка, токен заказа, слепок тарифов, источник.
 */
export function serializeOrderForMaster(o: OrderRow, userId: string) {
  const items = parseJson<ItemLike[]>(o.itemsJson, []).map((i) => ({
    name: i.name,
    quantity: i.quantity,
    category: i.category,
    zones: i.zones,
  }));

  return {
    id: o.id,
    status: o.status,
    createdAt: o.createdAt,
    clientName: o.clientName,
    clientPhone: o.clientPhone,
    carBrandModel: o.carBrandModel,
    carLicensePlate: o.carLicensePlate,
    carVin: o.carVin,
    carClass: o.carClass,
    isDirty: o.isDirty,
    serviceFormat: o.serviceFormat,
    deliveryAddress: o.deliveryAddress,
    desiredDate: o.desiredDate,
    desiredTime: o.desiredTime,
    agreedEntryDateTime: o.agreedEntryDateTime,
    clientComment: o.clientComment,
    items,
    photos: parseJson<unknown[]>(o.photosJson, []),
    mileage: o.mileage,
    fuelLevel: o.fuelLevel,
    damages: parseJson<unknown[]>(o.damagesJson, []),
    inspectionPhotosBefore: parseJson<unknown[]>(o.inspectionPhotosBeforeJson, []),
    inspectionPhotosAfter: parseJson<unknown[]>(o.inspectionPhotosAfterJson, []),
    actCompletedAt: o.actCompletedAt,
    assignedMasterId: o.assignedMasterId,
    assignedMasterName: o.assignedMasterName,
    workStartedAt: o.workStartedAt,
    bay: o.booking?.workbay?.name ?? null,
    // Только собственная выплата по собственному заказу
    myPayoutRub: o.assignedMasterId === userId ? o.masterPayoutRub : undefined,
  };
}

/** Админ видит всё (как раньше), JSON-поля разворачиваются в массивы. */
export function serializeOrderForAdmin<T extends OrderRow>(o: T) {
  return {
    ...o,
    items: parseJson<unknown[]>(o.itemsJson, []),
    photos: parseJson<unknown[]>(o.photosJson, []),
    damages: parseJson<unknown[]>(o.damagesJson, []),
    inspectionPhotosBefore: parseJson<unknown[]>(o.inspectionPhotosBeforeJson, []),
    inspectionPhotosAfter: parseJson<unknown[]>(o.inspectionPhotosAfterJson, []),
  };
}
