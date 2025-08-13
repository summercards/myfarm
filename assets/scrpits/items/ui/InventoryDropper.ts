import { _decorator, Component, Node, Vec3, input, Input, EventKeyboard, KeyCode } from 'cc';
import { PickupToInventory } from '../adapters/PickupToInventory';
import { ItemDatabase } from '../ItemDatabase';
import { DropSystem } from '../systems/DropSystem';
const { ccclass, property } = _decorator;

/**
 * 测试从背包丢弃物品到地面：按下 hotkey 时从背包移除1个并在玩家位置掉落。
 * 建议挂到玩家节点。
 */
@ccclass('InventoryDropper')
export class InventoryDropper extends Component {
  @property(PickupToInventory)
  invBridge: PickupToInventory | null = null;

  @property(ItemDatabase)
  itemDB: ItemDatabase | null = null;

  @property(Node)
  worldRoot: Node | null = null;

  @property
  hotkey: KeyCode = KeyCode.KEY_G;

  @property
  dropItemId: string = 'apple';

  private _dropper: DropSystem | null = null;

  onEnable() {
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }
  onDisable() {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  start() {
    if (this.itemDB && this.worldRoot) {
      this._dropper = new DropSystem(this.itemDB, this.worldRoot);
    }
  }

  onKeyDown(e: EventKeyboard) {
    if (e.keyCode !== this.hotkey) return;
    if (!this.invBridge || !this.invBridge.inventory || !this._dropper) return;

    // 背包减少1个
    const removed = this.invBridge.inventory.removeItem(this.dropItemId, 1);
    if (removed > 0) {
      // 在玩家当前位置掉落
      const pos = this.node.worldPosition.clone();
      this._dropper.dropItem(this.dropItemId, pos, 1);
      console.log('[InventoryDropper] 丢弃 1 个', this.dropItemId);
    } else {
      console.log('[InventoryDropper] 背包没有', this.dropItemId);
    }
  }
}
