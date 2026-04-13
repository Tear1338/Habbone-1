import 'server-only';

import { directusService as directus, rItems, rItem, cItem, uItem, dItem, directusUrl, serviceToken, USERS_TABLE } from './client';
import { directusFetch } from './fetch';
import type { ShopItem, ShopOrder, AdminNotification } from '@/types/shop';

export type { ShopItem, ShopOrder, AdminNotification };

// Real table names in the database
const SHOP_ITEMS_TABLE = 'shop_itens';
const SHOP_ORDERS_TABLE = 'shop_itens_mobis';
const ADMIN_NOTIFICATIONS_TABLE = 'acp_notificacoes';

// DB column names for shop_itens
const ITEMS_FIELDS = ['id', 'nome', 'imagem', 'preco_moedas', 'qtd_disponivel', 'disponivel', 'status'];
// DB column names for shop_itens_mobis (orders)
const ORDERS_FIELDS = ['id', 'id_item', 'comprador', 'data', 'ip', 'status'];
// DB column names for acp_notificacoes
const NOTIF_FIELDS = ['id', 'texto', 'tipo', 'autor', 'data', 'status'];

/**
 * Fix encoding issues in strings from Directus/MySQL.
 */
function fixEncoding(value: string): string {
  if (/[\u00c0-\u00c3][\u0080-\u00bf]/.test(value)) {
    try {
      const bytes = new Uint8Array([...value].map((c) => c.charCodeAt(0) & 0xff));
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch { /* fall through */ }
  }
  if (value.includes('\ufffd')) {
    return value.replace(/\ufffd/g, '');
  }
  return value;
}

function fixStr(v: unknown): string {
  return typeof v === 'string' ? fixEncoding(v) : String(v ?? '');
}

/* ------------------------------------------------------------------ */
/*  Mappers: DB rows → App types                                       */
/* ------------------------------------------------------------------ */

function mapDbToShopItem(row: any): ShopItem {
  return {
    id: Number(row.id),
    nome: fixStr(row.nome),
    descricao: undefined, // shop_itens doesn't have descricao column
    imagem: String(row.imagem || ''),
    preco: Number(row.preco_moedas || 0),
    estoque: Number(row.qtd_disponivel || 0),
    status: row.disponivel === 's' ? 'ativo' : (row.status === 'ativo' && row.disponivel !== 'n' ? 'ativo' : 'inativo'),
  };
}

function mapShopItemToDb(data: Partial<ShopItem>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (data.nome !== undefined) db.nome = data.nome;
  if (data.imagem !== undefined) db.imagem = data.imagem;
  if (data.preco !== undefined) db.preco_moedas = data.preco;
  if (data.estoque !== undefined) db.qtd_disponivel = data.estoque;
  if (data.status !== undefined) db.disponivel = data.status === 'ativo' ? 's' : 'n';
  return db;
}

function mapDbToShopOrder(row: any, itemsCache?: Map<number, ShopItem>): ShopOrder {
  const itemId = Number(row.id_item || 0);
  const item = itemsCache?.get(itemId);
  return {
    id: Number(row.id),
    user_id: 0, // shop_itens_mobis doesn't store user_id, only comprador (nick)
    user_nick: fixStr(row.comprador),
    item_id: itemId,
    item_nome: item?.nome,
    item_imagem: item?.imagem,
    preco: item?.preco || 0,
    status: row.status === 'ativo' ? 'pendente' : (row.status as any) || 'pendente',
  };
}

function mapDbToNotification(row: any): AdminNotification {
  return {
    id: Number(row.id),
    type: String(row.tipo || ''),
    title: fixStr(row.texto),
    message: undefined,
    link: undefined,
    read: row.status !== 'ativo', // ativo = unread, anything else = read
  };
}

/* ------------------------------------------------------------------ */
/*  Shop Items                                                         */
/* ------------------------------------------------------------------ */

export async function listShopItems(onlyActive = false): Promise<ShopItem[]> {
  try {
    const filter: Record<string, unknown> = {};
    if (onlyActive) {
      filter.status = { _eq: 'ativo' };
      filter.disponivel = { _eq: 's' };
    }
    const rows = await directus.request(
      rItems(SHOP_ITEMS_TABLE, {
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
        sort: ['-id'],
        limit: 500,
        fields: ITEMS_FIELDS,
      })
    );
    return ((rows || []) as any[]).map(mapDbToShopItem);
  } catch (error: any) {
    console.error('[Shop] Failed to list items:', error?.message || error);
    return [];
  }
}

export async function getShopItem(id: number): Promise<ShopItem | null> {
  try {
    const row = await directus.request(
      rItem(SHOP_ITEMS_TABLE, id, {
        fields: ITEMS_FIELDS,
      })
    );
    return row ? mapDbToShopItem(row) : null;
  } catch {
    return null;
  }
}

export async function createShopItem(data: Omit<ShopItem, 'id'>): Promise<ShopItem | null> {
  try {
    const dbData = {
      ...mapShopItemToDb(data),
      autor: 'admin',
      data: Math.floor(Date.now() / 1000),
      tipo: 1,
      id_util: 1,
      gratis: 'n',
      qtd_comprado: 0,
    };
    const row = await directus.request(cItem(SHOP_ITEMS_TABLE, dbData));
    return row ? mapDbToShopItem(row) : null;
  } catch (error: any) {
    console.error('[Shop] Failed to create item:', error?.message || error);
    throw error;
  }
}

export async function updateShopItem(id: number, data: Partial<ShopItem>): Promise<ShopItem | null> {
  try {
    const dbData = mapShopItemToDb(data);
    const row = await directus.request(uItem(SHOP_ITEMS_TABLE, id, dbData));
    return row ? mapDbToShopItem(row) : null;
  } catch (error) {
    console.error('[Shop] Failed to update item:', error);
    return null;
  }
}

export async function deleteShopItem(id: number): Promise<boolean> {
  try {
    await directus.request(dItem(SHOP_ITEMS_TABLE, id));
    return true;
  } catch (error) {
    console.error('[Shop] Failed to delete item:', error);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Shop Orders                                                        */
/* ------------------------------------------------------------------ */

export async function listShopOrders(options?: {
  status?: string;
  limit?: number;
  page?: number;
}): Promise<{ data: ShopOrder[]; total: number }> {
  const { status, limit = 50, page = 1 } = options || {};
  try {
    const filter: Record<string, unknown> = {};
    if (status) {
      // Map app status to DB status
      if (status === 'pendente') filter.status = { _eq: 'ativo' };
      else if (status === 'entregue') filter.status = { _eq: 'entregue' };
      else if (status === 'cancelado') filter.status = { _eq: 'cancelado' };
      else filter.status = { _eq: status };
    }

    const rows = await directus.request(
      rItems(SHOP_ORDERS_TABLE, {
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
        sort: ['-id'],
        limit,
        offset: (page - 1) * limit,
        fields: ORDERS_FIELDS,
      })
    );

    // Build items cache for order enrichment
    const items = await listShopItems(false);
    const itemsMap = new Map(items.map(i => [i.id, i]));

    // Count total
    const countParams: Record<string, string> = {};
    if (status === 'pendente') countParams['filter[status][_eq]'] = 'ativo';
    else if (status) countParams[`filter[status][_eq]`] = status;

    let total = 0;
    try {
      const countJson = await directusFetch<{ meta?: { total_count?: number } }>(
        `/items/${SHOP_ORDERS_TABLE}`,
        { params: { limit: '0', meta: 'total_count', ...countParams } }
      );
      total = Number(countJson?.meta?.total_count ?? 0);
    } catch {
      total = (rows as any[])?.length ?? 0;
    }

    return {
      data: ((rows || []) as any[]).map(r => mapDbToShopOrder(r, itemsMap)),
      total,
    };
  } catch (error) {
    console.error('[Shop] Failed to list orders:', error);
    return { data: [], total: 0 };
  }
}

export async function createShopOrder(data: {
  user_id: number;
  user_nick: string;
  item_id: number;
  item_nome: string;
  item_imagem?: string;
  preco: number;
}): Promise<ShopOrder | null> {
  try {
    const dbData = {
      id_item: data.item_id,
      comprador: data.user_nick,
      data: Math.floor(Date.now() / 1000),
      ip: '0.0.0.0',
      status: 'ativo', // 'ativo' in DB = 'pendente' in app
    };
    const row = await directus.request(cItem(SHOP_ORDERS_TABLE, dbData));
    return (row || null) as ShopOrder | null;
  } catch (error) {
    console.error('[Shop] Failed to create order:', error);
    return null;
  }
}

export async function updateShopOrder(id: number, data: Partial<ShopOrder>): Promise<ShopOrder | null> {
  try {
    const dbData: Record<string, unknown> = {};
    if (data.status) {
      // Map app status back to DB
      if (data.status === 'pendente') dbData.status = 'ativo';
      else dbData.status = data.status; // entregue, cancelado stay as-is
    }
    const row = await directus.request(uItem(SHOP_ORDERS_TABLE, id, dbData));
    return (row || null) as ShopOrder | null;
  } catch (error) {
    console.error('[Shop] Failed to update order:', error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Purchase logic (atomic: check coins → deduct → create order)       */
/* ------------------------------------------------------------------ */

export async function purchaseItem(userId: number, userNick: string, itemId: number): Promise<{
  ok: boolean;
  error?: string;
  order?: ShopOrder;
}> {
  const item = await getShopItem(itemId);
  if (!item) return { ok: false, error: 'Article introuvable' };
  if (item.status !== 'ativo') return { ok: false, error: 'Article indisponible' };
  if (item.estoque <= 0) return { ok: false, error: 'Rupture de stock' };

  const userRes = await fetch(`${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}/${userId}?fields=id,nick,moedas`, {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  });
  if (!userRes.ok) return { ok: false, error: 'Utilisateur introuvable' };
  const userData = (await userRes.json())?.data;
  if (!userData) return { ok: false, error: 'Utilisateur introuvable' };

  const currentCoins = Number(userData.moedas) || 0;
  if (currentCoins < item.preco) {
    return { ok: false, error: `Coins insuffisants (${currentCoins}/${item.preco})` };
  }

  const newBalance = currentCoins - item.preco;
  const patchRes = await fetch(`${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}/${userId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ moedas: newBalance }),
  });
  if (!patchRes.ok) return { ok: false, error: 'Erreur lors du paiement' };

  await updateShopItem(item.id, { estoque: Math.max(0, item.estoque - 1) });

  const order = await createShopOrder({
    user_id: userId,
    user_nick: userNick || userData.nick || 'Inconnu',
    item_id: item.id,
    item_nome: item.nome,
    item_imagem: item.imagem,
    preco: item.preco,
  });

  if (!order) return { ok: false, error: 'Erreur lors de la commande' };

  await createAdminNotification({
    type: 'shop_order',
    title: `Nouvelle commande : ${item.nome}`,
    message: `${userNick || userData.nick} a acheté "${item.nome}" pour ${item.preco} coins`,
    link: '/admin',
  });

  return { ok: true, order };
}

/* ------------------------------------------------------------------ */
/*  Admin Notifications (acp_notificacoes)                             */
/* ------------------------------------------------------------------ */

export async function listAdminNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<AdminNotification[]> {
  const { unreadOnly = false, limit = 50 } = options || {};
  try {
    const filter: Record<string, unknown> = {};
    if (unreadOnly) filter.status = { _eq: 'ativo' }; // ativo = unread

    const rows = await directus.request(
      rItems(ADMIN_NOTIFICATIONS_TABLE, {
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
        sort: ['-id'],
        limit,
        fields: NOTIF_FIELDS,
      })
    );
    return ((rows || []) as any[]).map(mapDbToNotification);
  } catch (error) {
    console.error('[Notifications] Failed to list:', error);
    return [];
  }
}

export async function createAdminNotification(data: {
  type: string;
  title: string;
  message?: string;
  link?: string;
}): Promise<AdminNotification | null> {
  try {
    const dbData = {
      texto: data.title + (data.message ? ` — ${data.message}` : ''),
      tipo: data.type === 'shop_order' ? 'success' : 'info',
      autor: 'system',
      data: Math.floor(Date.now() / 1000),
      status: 'ativo',
    };
    const row = await directus.request(cItem(ADMIN_NOTIFICATIONS_TABLE, dbData));
    return row ? mapDbToNotification(row) : null;
  } catch (error) {
    console.error('[Notifications] Failed to create:', error);
    return null;
  }
}

export async function markNotificationRead(id: number): Promise<boolean> {
  try {
    await directus.request(uItem(ADMIN_NOTIFICATIONS_TABLE, id, { status: 'lido' }));
    return true;
  } catch {
    return false;
  }
}

export async function markAllNotificationsRead(): Promise<boolean> {
  try {
    const unread = await listAdminNotifications({ unreadOnly: true, limit: 200 });
    await Promise.all(unread.map((n) => markNotificationRead(n.id)));
    return true;
  } catch {
    return false;
  }
}

export async function countUnreadNotifications(): Promise<number> {
  try {
    const rows = await listAdminNotifications({ unreadOnly: true, limit: 200 });
    return rows.length;
  } catch {
    return 0;
  }
}
