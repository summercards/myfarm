import { _decorator, Component, Node, UITransform, Label, Color } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SimpleInventoryList')
export class SimpleInventoryList extends Component {
  @property(Node) itemDBNode: Node | null = null;     // 拖 GameRoot（挂了 ItemDatabase）
  @property(Node) invBridgeNode: Node | null = null;  // 拖 play（挂了 PickupToInventory）

  private _db: any = null;
  private _bridge: any = null;
  private _label: Label | null = null;

  onLoad() {
    // 给节点一个可见尺寸
    const ui = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
    if (ui.contentSize.width < 10 || ui.contentSize.height < 10) ui.setContentSize(600, 220);

    // 用一个 Label 直接显示所有内容
    this._label = this.node.getComponent(Label) || this.node.addComponent(Label);
    this._label.color = new Color(255, 255, 255, 255);
    this._label.fontSize = 26;
    this._label.lineHeight = 30;

    // 取引用
    this._db = this.itemDBNode ? this.itemDBNode.getComponent('ItemDatabase') : null;
    this._bridge = this.invBridgeNode ? this.invBridgeNode.getComponent('PickupToInventory') : null;

    this.schedule(this.refresh, 0.2);
  }

  refresh = () => {
    if (!this._label) return;
    if (!this._db || !this._bridge || !this._bridge.inventory) {
      this._label.string = '(等待背包...)';
      return;
    }

    const inv = this._bridge.inventory;
    let lines: string[] = [];

    // 1) 优先从 slots 读
    const slots = inv.slots || [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s && s.id && s.count > 0) {
        const data = this._db.get ? this._db.get(s.id) : null;
        const name = (data && (data.displayName || data.id)) || String(s.id);
        lines.push(`${name} (${s.id}) x ${s.count}`);
      }
    }

    // 2) 回退：遍历 DB 用 getItemCount 汇总
    if (lines.length === 0 && typeof inv.getItemCount === 'function') {
      const all = (this._db.allItems || []) as any[];
      for (const d of all) {
        const id = d?.id;
        if (!id) continue;
        const c = inv.getItemCount(id);
        if (c > 0) {
          const name = d.displayName || id;
          lines.push(`${name} (${id}) x ${c}`);
        }
      }
    }

    this._label.string = lines.length ? lines.join('\n') : '(背包为空)';
  }
}
