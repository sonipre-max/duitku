import Dexie, { Table } from 'dexie';

export interface Account { id?: number; name: string; balance0: number }
export interface Tx { id?: number; date: string; type: 'in' | 'out'; amount: number; category: string; accountId: number; note: string }
export interface Budget { id?: number; category: string; limit: number }
export interface Task {
  id?: number; title: string; date: string; time: string; priority: 1 | 2 | 3;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly'; done: boolean; doneOn: string[];
}
export interface DcaPlan {
  id?: number; name: string; daily: number; startDate: string; lastRun: string;
  alloc: Record<string, number>; active: boolean;
}
export interface Trade { id?: number; planId: number; date: string; symbol: string; price: number; amount: number; qty: number }
export interface Kv { key: string; value: any }

class DB extends Dexie {
  accounts!: Table<Account, number>;
  txs!: Table<Tx, number>;
  budgets!: Table<Budget, number>;
  tasks!: Table<Task, number>;
  plans!: Table<DcaPlan, number>;
  trades!: Table<Trade, number>;
  kv!: Table<Kv, string>;
  constructor() {
    super('duitku');
    this.version(1).stores({
      accounts: '++id', txs: '++id,date,accountId', budgets: '++id', tasks: '++id,date',
      plans: '++id', trades: '++id,planId,symbol,date', kv: 'key'
    });
  }
}
export const db = new DB();
export const TABLES = ['accounts', 'txs', 'budgets', 'tasks', 'plans', 'trades'] as const;
export const getKv = async (key: string, def: any) => (await db.kv.get(key))?.value ?? def;
export const setKv = (key: string, value: any) => db.kv.put({ key, value });
