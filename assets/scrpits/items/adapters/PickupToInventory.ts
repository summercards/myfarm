// scrpits/items/adapters/PickupToInventory.ts
import { _decorator, Component } from 'cc';
import { Inventory } from '../Inventory';
import { ItemDatabase } from '../ItemDatabase';
const { ccclass, property } = _decorator;

/**
 * 只做背包数据的桥接（创建 Inventory 并提供 push/pop）
 * 键位、丢弃、手上显示全部交给 InventoryController 处理
 */
@ccclass('PickupToInventory')
export class PickupToInventory extends Component {
    @property(ItemDatabase)
    itemDB: ItemDatabase | null = null;

    @property
    capacity: number = 20;

    /** 运行时背包实例 */
    inventory: Inventory | null = null;

    onLoad() {
        if (!this.itemDB) {
            console.warn('[PickupToInventory] 请把 ItemDatabase 拖到 itemDB 上');
            return;
        }
        this.inventory = new Inventory(this.capacity, this.itemDB);
    }

    /** 拾取（返回剩余未放入数量），默认新物品设为选中 */
    push(itemId: string, count = 1): number {
        if (!this.inventory) return count;
        return this.inventory.addItem(itemId, count, true);
    }

    /** 按ID汇总移除（一般不用，推荐 Inventory.removeAt 精确按格减） */
    pop(itemId: string, count = 1): number {
        if (!this.inventory) return 0;
        return this.inventory.removeItem(itemId, count);
    }
}
