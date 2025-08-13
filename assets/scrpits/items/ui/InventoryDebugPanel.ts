import { _decorator, Component, Label } from 'cc';
import { ItemDatabase } from '../ItemDatabase';
import { PickupToInventory } from '../adapters/PickupToInventory';
const { ccclass, property } = _decorator;

/**
 * 纯调试用的背包面板：把当前背包里的所有物品数量用多行文本显示出来。
 * 用法：
 * 1. 新建一个 Canvas/Label，把本脚本挂在同一个节点上。
 * 2. 把 label 指到该 Label 组件。
 * 3. itemDB 指到场景里的 ItemDatabase；invBridge 指到玩家上的 PickupToInventory。
 * 4. 运行后按 I 键（可选，用 InventoryHotkeys）显示/隐藏本面板。
 */
@ccclass('InventoryDebugPanel')
export class InventoryDebugPanel extends Component {
  @property(Label)
  label: Label | null = null;

  @property(ItemDatabase)
  itemDB: ItemDatabase | null = null;

  @property(PickupToInventory)
  invBridge: PickupToInventory | null = null;

  update(dt: number) {
    if (!this.label || !this.itemDB || !this.invBridge || !this.invBridge.inventory) return;
    const inv = this.invBridge.inventory;
    const db = this.itemDB;

    // 汇总背包里每种 id 的数量
    const lines: string[] = [];
    for (const data of (db as any).allItems as any[]) {
      if (!data) continue;
      const id: string = data.id;
      const name: string = data.displayName || id;
      const count = inv.getItemCount(id);
      if (count > 0) {
        lines.push(`${name} (${id}) x ${count}`);
      }
    }
    this.label.string = lines.length > 0 ? lines.join('\n') : '(背包为空)';
  }
}
