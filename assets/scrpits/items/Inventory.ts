// scrpits/items/Inventory.ts
import { ItemStack } from './ItemStack';
import { ItemDatabase } from './ItemDatabase';

export class Inventory {
    slots: (ItemStack | null)[] = [];
    selectedIndex: number = -1;

    constructor(public capacity: number, private db: ItemDatabase) {
        this.slots = new Array(capacity).fill(null);
    }

    getItemCount(id: string): number {
        return this.slots.reduce((sum, s) => (s && s.id === id ? sum + s.count : sum), 0);
    }

    /**
     * 增加物品
     * @param id 物品ID
     * @param count 数量
     * @param selectNew 是否把刚落位的格子设为选中（默认 true）
     * @returns remain 剩余未放入数量
     */
    addItem(id: string, count = 1, selectNew = true): number {
        let remain = count;
        let lastSlot = -1;

        // 1. 堆叠到已有
        for (let i = 0; i < this.slots.length && remain > 0; i++) {
            const s = this.slots[i];
            if (s && s.id === id) {
                s.count += remain; // 简化为无限堆叠，若需要上限可自行拆分
                lastSlot = i;
                remain = 0;
                break;
            }
        }
        // 2. 放到空格
        for (let i = 0; i < this.slots.length && remain > 0; i++) {
            if (!this.slots[i]) {
                this.slots[i] = new ItemStack(id, remain);
                lastSlot = i;
                remain = 0;
                break;
            }
        }
        // 3. 选中新放入的格子
        if (selectNew && lastSlot >= 0) {
            this.selectedIndex = lastSlot;
        }

        this.ensureSelectedValid();
        return remain;
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
        this.ensureSelectedValid();
        return count - remain;
    }

    removeAt(index: number, count = 1): number {
        if (index < 0 || index >= this.slots.length) return 0;
        const s = this.slots[index];
        if (!s) return 0;
        const take = Math.min(s.count, count);
        s.count -= take;
        if (s.count <= 0) this.slots[index] = null;
        this.ensureSelectedValid();
        return take;
    }

    select(index: number): boolean {
        if (index >= 0 && index < this.slots.length && this.slots[index]) {
            this.selectedIndex = index;
            return true;
        }
        this.selectedIndex = -1; // 选到空格 = 取消
        return false;
    }

    getSelected() {
        const i = this.selectedIndex;
        if (i < 0 || i >= this.slots.length) return null;
        return this.slots[i];
    }

    selectNext(): void {
        if (!this.slots.length) return;
        let start = this.selectedIndex;
        for (let step = 0; step < this.slots.length; step++) {
            start = (start + 1 + this.slots.length) % this.slots.length;
            if (this.slots[start]) {
                this.selectedIndex = start;
                return;
            }
        }
        this.selectedIndex = -1;
    }

    selectPrev(): void {
        if (!this.slots.length) return;
        let start = this.selectedIndex;
        for (let step = 0; step < this.slots.length; step++) {
            start = (start - 1 + this.slots.length) % this.slots.length;
            if (this.slots[start]) {
                this.selectedIndex = start;
                return;
            }
        }
        this.selectedIndex = -1;
    }

    ensureSelectedValid(): void {
        const i = this.selectedIndex;
        if (i >= 0 && i < this.slots.length && this.slots[i]) return;
        for (let k = 0; k < this.slots.length; k++) {
            if (this.slots[k]) {
                this.selectedIndex = k;
                return;
            }
        }
        this.selectedIndex = -1;
    }
}
