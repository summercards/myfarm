import { ItemStack } from './ItemStack';
import { ItemDatabase } from './ItemDatabase';

export class Inventory {
  slots: (ItemStack | null)[] = [];

  constructor(public capacity: number, private db: ItemDatabase) {
    this.slots = new Array(capacity).fill(null);
  }

  getItemCount(id: string): number {
    return this.slots.reduce((sum, s) => s && s.id === id ? sum + s.count : sum, 0);
  }

  addItem(id: string, count = 1): number {
    const data = this.db.get(id);
    if (!data) {
      console.warn('[Inventory] addItem failed, no ItemData for id:', id);
      return count; // 全部剩余
    }
    const maxStack = Math.max(1, data.maxStack);
    let remain = count;

    // 1) 填充已有堆叠
    for (let i = 0; i < this.slots.length && remain > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id) {
        const can = maxStack - s.count;
        if (can > 0) {
          const put = Math.min(can, remain);
          s.count += put;
          remain -= put;
        }
      }
    }

    // 2) 使用空槽新建堆叠
    for (let i = 0; i < this.slots.length && remain > 0; i++) {
      if (!this.slots[i]) {
        const put = Math.min(maxStack, remain);
        this.slots[i] = new ItemStack(id, put, 0);
        remain -= put;
      }
    }

    return remain; // 装不下的剩余数量
  }

  removeItem(id: string, count = 1): number {
    let remain = count;
    for (let i = 0; i < this.slots.length && remain > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id) {
        const take = Math.min(s.count, remain);
        s.count -= take;
        remain -= take;
        if (s.count <= 0) this.slots[i] = null;
      }
    }
    return count - remain; // 实际移除
  }
}
