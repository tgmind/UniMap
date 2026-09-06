import Dexie, { Table } from 'dexie';
import { UniItem, ConnectedDevice } from '../types';

export class UniMapDatabase extends Dexie {
  items!: Table<UniItem, string>;
  devices!: Table<ConnectedDevice, string>;

  constructor() {
    super('UniMapDatabase');
    this.version(1).stores({
      items: 'id, user_id, type, device_name, is_pinned, created_at, updated_at',
      devices: 'id, user_id, device_token, last_active_at, is_revoked',
    });
  }
}

export const localDb = new UniMapDatabase();
