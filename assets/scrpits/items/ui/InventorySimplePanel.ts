import {
  _decorator, Component, Node, UITransform, Label, Color, Layout, Size
} from 'cc';
const { ccclass, property } = _decorator;

/**
 * 最简单的背包面板（文字版）
 * - 每隔一段时间重新生成一组 Label，逐行显示：显示名(id) x 数量
 * - 不依赖 Sprite/SpriteFrame，避免看不见的问题
 * - 数据来源：优先 inventory.slots；若为空，回退用 itemDB.allItems + inventory.getItemCount(id)
 * - 检查器设置：
 *    itemDBNode = GameRoot（挂有 ItemDatabase）
 *    invBridgeNode = play（挂有 PickupToInventory）
 */
@ccclass('InventorySimplePanel')
export class InventorySimplePanel extends Component {
  @property(Node)
  itemDBNode: Node | null = null;

  @property(Node)
  invBridgeNode: Node | null = null;

  @property(Node)
  content: Node | null = null; // 可留空，脚本会自动创建

  @property
  fontSize = 26;

  @property
  lineHeight = 30;

  @property
  spacingY = 6;

  @property
  refreshInterval = 0.2;

  @property
  debugLog = false;

  private _db: any = null;      // ItemDatabase
  private _bridge: any = null;  // PickupToInventory

  onLoad() {
    // 面板节点给个可见尺寸（若未设置）
    const ui = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
    if (ui.contentSize.width < 10 || ui.contentSize.height < 10) {
      ui.setContentSize(600, 260);
    }
    this.node.active = true;

    // 背景：用一个大 Label 画“口”作为半透明底，保证你能看到这个面板区域
    if (!this.node.getChildByName('BG')) {
      const bg = new Node('BG');
      const bgUI = bg.addComponent(UITransform);
      bgUI.setContentSize(ui.contentSize);
      const lb = bg.addComponent(Label);
      lb.string = '口';
      lb.fontSize = Math.max(40, Math.floor(Math.min(ui.contentSize.width, ui.contentSize.height) * 0.6));
      lb.lineHeight = lb.fontSize + 2;
      lb.color = new Color(0, 0, 0, 140);
      this.node.addChild(bg);
    }

    // 内容容器
    if (!this.content) {
      this.content = new Node('Content');
      const cUI = this.content.addComponent(UITransform);
      // 让内容区缩进一点，避免贴边
      cUI.setContentSize(new Size(ui.contentSize.width - 40, ui.contentSize.height - 40));
      this.content.setPosition(- (ui.contentSize.width - 40) / 2 + 10, (ui.contentSize.height - 40) / 2 - 10);
      const layout = this.content.addComponent(Layout);
      layout.type = Layout.Type.VERTICAL;
      layout.resizeMode = Layout.ResizeMode.CONTAINER;
      layout.spacingY = this.spacingY;
      this.node.addChild(this.content);
    }

    // 引用
    this._db = this.itemDBNode ? this.itemDBNode.getComponent('ItemDatabase') : null;
    this._bridge = this.invBridgeNode ? this.invBridgeNode.getComponent('PickupToInventory') : null;
    if (this.debugLog) {
      console.log('[SimpleInv] onLoad db=', !!this._db, 'bridge=', !!this._bridge);
    }

    this.unscheduleAllCallbacks();
    this.schedule(this.refresh, Math.max(0.05, this.refreshInterval));
  }

  private _collectItems(): Array<{ id: string; name: string; count: number }> {
    const out: Array<{ id: string; name: string; count: number }> = [];
    const inv = this._bridge && this._bridge.inventory ? this._bridge.inventory : null;

    if (!inv || !this._db) return out;

    // 1) 优先：逐槽读取
    const slots = inv.slots || [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s && s.id && s.count > 0) {
        const data = this._db.get ? this._db.get(s.id) : null;
        const name = (data && (data.displayName || data.id)) || String(s.id);
        out.push({ id: s.id, name, count: s.count });
      }
    }

    // 2) 回退：遍历 DB，用 getItemCount 汇总
    if (out.length === 0 && typeof inv.getItemCount === 'function') {
      const all = (this._db.allItems || []) as any[];
      for (const d of all) {
        const id = d?.id;
        if (!id) continue;
        const c = inv.getItemCount(id);
        if (c > 0) {
          const name = d.displayName || id;
          out.push({ id, name, count: c });
        }
      }
    }
    return out;
  }

  refresh = () => {
    if (!this._db && this.itemDBNode) this._db = this.itemDBNode.getComponent('ItemDatabase');
    if (!this._bridge && this.invBridgeNode) this._bridge = this.invBridgeNode.getComponent('PickupToInventory');
    if (!this._db || !this._bridge || !this._bridge.inventory || !this.content) {
      if (this.debugLog) console.warn('[SimpleInv] waiting...', !!this._db, !!this._bridge, !!(this._bridge && this._bridge.inventory), !!this.content);
      return;
    }

    const list = this._collectItems();

    // 粗暴点：清空重建
    for (const child of [...this.content.children]) child.destroy();

    if (list.length === 0) {
      const line = new Node('Empty');
      const lb = line.addComponent(Label);
      lb.string = '（背包为空）';
      lb.fontSize = this.fontSize;
      lb.lineHeight = this.lineHeight;
      lb.color = new Color(220, 220, 220, 255);
      this.content.addChild(line);
      return;
    }

    for (const it of list) {
      const line = new Node(it.id);
      const lb = line.addComponent(Label);
      lb.string = `${it.name} (${it.id}) x ${it.count}`;
      lb.fontSize = this.fontSize;
      lb.lineHeight = this.lineHeight;
      lb.color = new Color(220, 220, 220, 255);
      this.content.addChild(line);
    }
  }
}
