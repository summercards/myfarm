import {
  _decorator, Component, Node, UITransform, Layout, Size,
  Label, Color, Graphics, Vec3
} from 'cc';
const { ccclass, property } = _decorator;

/**
 * InventoryGridLite（极简格子版，只用 Label/Graphics）
 * - 面板/格子底色用 Graphics 画半透明矩形，必可见
 * - 每格显示：物品名(或id) + 右下角数量（1也显示）
 * - 数据源：优先 inventory.slots；为空则回退 itemDB.allItems + inventory.getItemCount(id)
 * - 请在检查器把：
 *    itemDBNode = GameRoot（挂 ItemDatabase）
 *    invBridgeNode = play（挂 PickupToInventory）
 */
@ccclass('InventoryGridLite')
export class InventoryGridLite extends Component {
  @property(Node) itemDBNode: Node | null = null;
  @property(Node) invBridgeNode: Node | null = null;

  @property rows = 4;
  @property cols = 5;
  @property cellSize = 84;
  @property gap = 10;
  @property refreshInterval = 0.2;

  @property(Color) panelBgColor = new Color(0, 0, 0, 120);
  @property(Color) cellBgColor = new Color(40, 40, 40, 180);
  @property(Color) nameColor   = new Color(220, 220, 220, 255);
  @property(Color) countColor  = new Color(255, 255, 255, 255);

  private _db: any = null;      // ItemDatabase
  private _bridge: any = null;  // PickupToInventory
  private _gridRoot: Node | null = null;
  private _cells: Node[] = [];

  onLoad() {
    // 面板尺寸(如果没设就给一个可见值)
    const ui = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
    if (ui.contentSize.width < 10 || ui.contentSize.height < 10) {
      ui.setContentSize(640, 420);
    }
    this.node.active = true;

    // 画面板背景
    this._ensurePanelBG();

    // 引用
    this._db = this.itemDBNode ? this.itemDBNode.getComponent('ItemDatabase') : null;
    this._bridge = this.invBridgeNode ? this.invBridgeNode.getComponent('PickupToInventory') : null;

    // 生成网格
    this._buildGrid();

    // 定时刷新
    this.unscheduleAllCallbacks();
    this.schedule(this.refresh, Math.max(0.05, this.refreshInterval));
  }

  /** 半透明面板背景（Graphics） */
  private _ensurePanelBG() {
    const name = 'PanelBG';
    let bg = this.node.getChildByName(name);
    if (!bg) {
      bg = new Node(name);
      this.node.addChild(bg);
      bg.addComponent(UITransform);
      bg.addComponent(Graphics);
    }
    const g = bg!.getComponent(Graphics)!;
    const pad = 16;
    const w = this.cols * this.cellSize + (this.cols - 1) * this.gap + pad * 2;
    const h = this.rows * this.cellSize + (this.rows - 1) * this.gap + pad * 2;

    g.clear();
    g.fillColor = this.panelBgColor;
    g.roundRect(-w / 2, -h / 2, w, h, 10);
    g.fill();
  }

  /** 生成 rows×cols 格子（每格：底色 + 名称 + 数量） */
  private _buildGrid() {
    // Grid 容器 + 布局
    if (!this._gridRoot) {
      this._gridRoot = new Node('Grid');
      this.node.addChild(this._gridRoot);

      const ui2 = this._gridRoot.addComponent(UITransform);
      ui2.setContentSize(new Size(
        this.cols * this.cellSize + (this.cols - 1) * this.gap,
        this.rows * this.cellSize + (this.rows - 1) * this.gap,
      ));

      const layout = this._gridRoot.addComponent(Layout);
      layout.type = Layout.Type.GRID;
      layout.resizeMode = Layout.ResizeMode.CONTAINER;
      layout.startAxis = Layout.AxisDirection.HORIZONTAL;
      layout.cellSize = new Size(this.cellSize, this.cellSize);
      layout.spacingX = this.gap;
      layout.spacingY = this.gap;
    }

    // 清旧建新
    for (const c of this._cells) c.destroy();
    this._cells.length = 0;

    const total = this.rows * this.cols;
    for (let i = 0; i < total; i++) {
      const cell = new Node(`Cell_${i}`);
      const ui3 = cell.addComponent(UITransform);
      ui3.setContentSize(this.cellSize, this.cellSize);

      // 底色
      const bg = new Node('BG');
      bg.addComponent(UITransform);
      const g = bg.addComponent(Graphics);
      g.clear();
      g.fillColor = this.cellBgColor;
      g.roundRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 8);
      g.fill();
      cell.addChild(bg);

      // 名称（居中）
      const nameNode = new Node('Name');
      const nUI = nameNode.addComponent(UITransform);
      nUI.setContentSize(this.cellSize - 10, this.cellSize - 28);
      const nLb = nameNode.addComponent(Label);
      nLb.string = '';
      nLb.fontSize = 16;
      nLb.lineHeight = 18;
      nLb.color = this.nameColor;
      nameNode.setPosition(new Vec3(0, 6, 0));
      cell.addChild(nameNode);

      // 数量（右下）
      const cntNode = new Node('Count');
      cntNode.addComponent(UITransform);
      const cLb = cntNode.addComponent(Label);
      cLb.string = '';
      cLb.fontSize = 20;
      cLb.lineHeight = 22;
      cLb.color = this.countColor;
      cntNode.setPosition(new Vec3(this.cellSize / 2 - 12, -(this.cellSize / 2) + 12, 0));
      cell.addChild(cntNode);

      this._gridRoot!.addChild(cell);
      this._cells.push(cell);
    }
  }

  /** 采集背包物品（优先 slots，回退 getItemCount） */
  private _collect(): Array<{ id: string; name: string; count: number }> {
    const out: Array<{ id: string; name: string; count: number }> = [];
    const inv = this._bridge && this._bridge.inventory ? this._bridge.inventory : null;
    if (!inv || !this._db) return out;

    const slots = inv.slots || [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s && s.id && s.count > 0) {
        const d = this._db.get ? this._db.get(s.id) : null;
        const name = (d && (d.displayName || d.id)) || String(s.id);
        out.push({ id: s.id, name, count: s.count });
      }
    }
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

  /** 刷新格子内容 */
  refresh = () => {
    if (!this._db && this.itemDBNode) this._db = this.itemDBNode.getComponent('ItemDatabase');
    if (!this._bridge && this.invBridgeNode) this._bridge = this.invBridgeNode.getComponent('PickupToInventory');
    if (!this._db || !this._bridge || !this._bridge.inventory || !this._gridRoot) return;

    const items = this._collect();
    let k = 0;
    for (let i = 0; i < this._cells.length; i++) {
      const cell = this._cells[i];
      const nameLb = cell.getChildByName('Name')?.getComponent(Label);
      const countLb = cell.getChildByName('Count')?.getComponent(Label);

      const e = k < items.length ? items[k++] : null;
      if (e && nameLb && countLb) {
        nameLb.string = `${e.name}\n(${e.id})`;
        countLb.string = String(e.count); // 1 也显示
      } else {
        if (nameLb) nameLb.string = '';
        if (countLb) countLb.string = '';
      }
    }
  }
}
