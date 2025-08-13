import { _decorator, Component } from 'cc';
import { Inventory } from '../Inventory';
import { ItemDatabase } from '../ItemDatabase';
const { ccclass, property } = _decorator;

/**
 * JS 兼容版：不使用 TypeScript 类型标注，避免“Did not expect a type annotation”错误。
 * 只要把本文件覆盖原来的 PickupToInventory.ts 就可以了。
 */
@ccclass('PickupToInventory')
export class PickupToInventory extends Component {

  @property(ItemDatabase)
  itemDB = null;

  // 运行时创建出来
  inventory = null;

  onLoad() {
    if (this.itemDB) {
      // 20 个格子，可自行调整
      this.inventory = new Inventory(20, this.itemDB);
    }
  }

  /** 拾取时写入背包 */
  push(itemId, count = 1) {
    if (!this.inventory) return count;
    const remain = this.inventory.addItem(itemId, count);
    if (remain > 0) {
      console.warn('[PickupToInventory] 背包装不下，剩余：', remain);
    }
    return remain;
  }

  /** 丢弃/使用时从背包移除 */
  pop(itemId, count = 1) {
    if (!this.inventory) return 0;
    return this.inventory.removeItem(itemId, count);
  }
}
