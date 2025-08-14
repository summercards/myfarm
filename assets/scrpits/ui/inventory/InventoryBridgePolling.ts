import { _decorator, Component, Node } from 'cc';
import { UIBus, UIEvents, UIItem } from '../core/UIBus';
const { ccclass, property } = _decorator;

/**
 * 桥接器：定时从你的背包读取数据，转成 UIItem[]，派发到 UIBus
 * - UI 不关心来源，只订阅 UIEvents.InventoryChanged
 */
@ccclass('InventoryBridgePolling')
export class InventoryBridgePolling extends Component {
  @property(Node) itemDBNode: Node | null = null;   // GameRoot（挂 ItemDatabase）
  @property(Node) invHolder: Node | null = null;    // 玩家节点 play（挂 PickupToInventory）
  @property refreshInterval = 0.2;

  private _db: any = null;      // ItemDatabase
  private _bridge: any = null;  // PickupToInventory

  onLoad() {
    this._db = this.itemDBNode ? this.itemDBNode.getComponent('ItemDatabase') : null;
    this._bridge = this.invHolder ? this.invHolder.getComponent('PickupToInventory') : null;
    this.schedule(this.tick, Math.max(0.05, this.refreshInterval));
  }

  private tick = () => {
    if (!this._db || !this._bridge || !this._bridge.inventory) return;

    const inv = this._bridge.inventory;
    const items: UIItem[] = [];

    // 1) 优先按槽位读取
    const slots = inv.slots || [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s && s.id && s.count > 0) {
        const data = this._db.get ? this._db.get(s.id) : null;
        items.push({
          id: s.id,
          name: (data && (data.displayName || data.id)) || String(s.id),
          count: s.count,
          icon: data?.icon ?? null, // icon 可为空，UI 仍会显示文字+数量
        });
      }
    }

    // 2) 如果 slots 为空，回退到 getItemCount 方案
    if (items.length === 0 && typeof inv.getItemCount === 'function') {
      const all = (this._db.allItems || []) as any[];
      for (const d of all) {
        const id = d?.id;
        if (!id) continue;
        const c = inv.getItemCount(id);
        if (c > 0) {
          items.push({
            id,
            name: d.displayName || id,
            count: c,
            icon: d?.icon ?? null,
          });
        }
      }
    }

    // 推送给 UI
    UIBus.emit(UIEvents.InventoryChanged, items);
  }
}
