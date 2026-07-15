import type { UserProfile } from '@/context/UserContext';

/** true if user owns the record (or is admin) */
export function canManage(user: UserProfile, record: any): boolean {
  if (user.role === 'admin') return true;
  return isOwner(user, record);
}

/** true if user can delete the record.
 *  Delete permission is stricter than display/edit ownership:
 *  only the account stored in owner_user_id (or admin) can delete.
 */
export function canDelete(user: UserProfile, record: any): boolean {
  if (user.role === 'admin') return true;
  return isCreatorOwner(user, record);
}

/** true only when ownership is tied to the logged-in user's id/email from backend owner fields. */
export function isCreatorOwner(user: UserProfile, record: any): boolean {
  if (!record) return false;

  const userId = user.id != null ? String(user.id) : '';
  const ownerId = record.owner_user_id ?? record.owner_id ?? record.user_id ?? record.created_by_user_id ?? record.owner?.id ?? record.owner_user?.id ?? record.created_by?.id;
  if (userId && ownerId != null && String(ownerId) === userId) return true;

  const email = user.email?.trim().toLowerCase();
  const ownerEmail = (record.owner_email ?? record.owner?.email ?? record.owner_user?.email ?? record.created_by?.email ?? '').trim().toLowerCase();
  return Boolean(email && ownerEmail === email);
}

/** true if the record belongs to this user */
export function isOwner(user: UserProfile, record: any): boolean {
  if (record.is_owner === true || record.is_mine === true) return true;

  const userId = user.id != null ? String(user.id) : '';
  const ownerId = record.owner_user_id ?? record.owner_id ?? record.user_id ?? record.created_by_user_id ?? record.owner?.id ?? record.owner_user?.id ?? record.created_by?.id;
  if (userId && ownerId != null && String(ownerId) === userId) return true;

  const email = user.email?.trim().toLowerCase();
  const ownerEmail = (record.owner_email ?? record.owner?.email ?? record.owner_user?.email ?? record.created_by?.email ?? '').trim().toLowerCase();
  if (email && ownerEmail === email) return true;

  const name = user.name?.trim().replace(/\s+/g, ' ');
  if (!name) return false;
  const ownerName = (
    record.researcher ?? record.author ?? record.owner_name ??
    record.owner?.name ?? record.owner_user?.name ?? record.created_by?.name ?? record.name ?? ''
  ).trim().replace(/\s+/g, ' ');
  return (
    ownerName === name
  );
}

/** Sensitive financial data is visible only to its owner or an admin. */
export function canViewBudget(user: UserProfile, record: any): boolean {
  return canManage(user, record);
}

/** Filter a list to only the records this user created.
 *  Used for profile stats and notifications — NOT for list screens
 *  (list screens show all records; canManage controls edit/delete access). */
export function filterOwned<T>(user: UserProfile, list: T[]): T[] {
  if (user.role === 'admin') return list;
  return list.filter((r) => isOwner(user, r as any));
}

export function isAdmin(user: UserProfile): boolean {
  return user.role === 'admin';
}

/** Mark records in the all-list as owned when the mine-list contains the same id. */
export function mergeOwnedRecords<T extends Record<string, any>>(all: T[], mine: T[]): T[] {
  const ownedById = new Map(
    mine
      .filter((record) => record?.id != null)
      .map((record) => [String(record.id), { ...record, is_owner: true } as T])
  );

  const seen = new Set<string>();
  const merged = all.map((record) => {
    const id = record?.id != null ? String(record.id) : '';
    if (!id) return record;
    seen.add(id);
    const owned = ownedById.get(id);
    return owned ? ({ ...record, ...owned, is_owner: true } as T) : record;
  });

  for (const [id, owned] of ownedById) {
    if (!seen.has(id)) merged.push(owned);
  }

  return merged;
}
