/**
 * 可选适配器：如果你想把现有 ItemPickup 的拾取结果转为背包加物品，
 * 可以把本脚本挂到玩家上，并在拾取成功的位置调用 push(itemId)。
 * 不会自动改动你已有的拾取逻辑。
 */
import { _decorator, Component } from 'cc';
import { Inventory } from '../Inventory';
import { ItemDatabase } from '../ItemDatabase';
const { ccclass, property } = _decorator;

@ccclass('PickupToInventory')
export class PickupToInventory extends Component {
  @property(ItemDatabase)
  itemDB: ItemDatabase | null = null;

  inventory: Inventory | null = null;

  onLoad() {
    if (this.itemDB) {
      this.inventory = new Inventory(20, this.itemDB);
    }
  }

  /** 拾取到背包（外部在合适时机调用） */
  push(itemId: string, count = 1) {
    if (!this.inventory) return count;
    const remain = this.inventory.addItem(itemId, count);
    if (remain > 0) {
      console.warn('[PickupToInventory] 背包装不下，剩余：', remain);
    }
    return remain;
  }
}
