import {
  _decorator, Component, Node, UITransform, Layout, Size,
  Label, Color, Sprite, SpriteFrame, Graphics, Vec3
} from 'cc';
const { ccclass, property } = _decorator;

/**
 * InventoryPanel（强可见·最终版）
 * - Panel 背景 & 每个格子底色使用 Graphics 实时绘制（半透明），保证可见。
 * - 有图标时显示 IconSprite（SpriteFrame），无图标时显示 IconText（物品 id）。
 * - 数量 1 也显示。
 * - 数据源：优先 inventory.slots；为空则回退用 itemDB.allItems + inventory.getItemCount(id)。
 * - 检查器：
 *    itemDBNode = GameRoot（挂 ItemDatabase）
 *    invBridgeNode = play（挂 PickupToInventory）
 */
@ccclass('InventoryPanel')
export class InventoryPanel extends Component {
  @property(Node) gridRoot: Node | null = null;
  @property(Node) itemDBNode: Node | null = null;
  @property(Node) invBridgeNode: Node | null = null;

  @property rows = 4;
  @property cols = 5;
  @property cellSize = 80;
  @property gap = 8;
  @property refreshInterval = 0.2;
  @property debugLog = false;

  private _db: any = null;       // ItemDatabase
  private _bridge: any = null;   // PickupToInventory
  private _cells: Node[] = [];
  private _readyLogged = false;

  onLoad() {
    // 面板节点尺寸（如果没设置给一个合理默认）
    const ui = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
    if (ui.contentSize.width < 10 || ui.contentSize.height < 10) {
      ui.setContentSize(600, 420);
    }
    this.node.active = true;

    // 背景：Graphics 画半透明矩形
    this._ensurePanelBG();

    // 引用
    this._db = this.itemDBNode ? this.itemDBNode.getComponent('ItemDatabase') : null;
    this._bridge = this.invBridgeNode ? this.invBridgeNode.getComponent('PickupToInventory') : null;
    if (this.debugLog) console.log('[InvPanel] onLoad db=', !!this._db, 'bridge=', !!this._bridge);

    // 网格
    this._buildGrid();

    // 定时刷新
    this.unscheduleAllCallbacks();
    this.schedule(this.refresh, Math.max(0.05, this.refreshInterval));
  }

  private _ensurePanelBG() {
    let bg = this.node.getChildByName('PanelBG');
    if (!bg) {
      bg = new Node('PanelBG');
      this.node.addChild(bg);
      bg.addComponent(UITransform);
      const g = bg.addComponent(Graphics);
      // 初次画
      this._drawPanelBG(g);
    } else {
      const g = bg.getComponent(Graphics);
      if (g) this._drawPanelBG(g);
    }
  }

  private _drawPanelBG(g: Graphics) {
    const ui = this.node.getComponent(UITransform)!;
    const pad = 12; // 背景比网格稍大一点
    const w = this.cols * this.cellSize + (this.cols - 1) * this.gap + pad * 2;
    const h = this.rows * this.cellSize + (this.rows - 1) * this.gap + pad * 2;

    g.clear();
    g.fillColor = new Color(0, 0, 0, 120);
    // 以 (0,0) 为中心画一个带圆角的矩形
    const x = -w / 2, y = -h / 2;
    const r = 8;
    g.roundRect(x, y, w, h, r);
    g.fill();
  }

  private _buildGrid() {
    // 创建 Grid 容器 + 布局
    if (!this.gridRoot) {
      this.gridRoot = new Node('Grid');
      this.node.addChild(this.gridRoot);

      const ui2 = this.gridRoot.addComponent(UITransform);
      ui2.setContentSize(new Size(
        this.cols * this.cellSize + (this.cols - 1) * this.gap,
        this.rows * this.cellSize + (this.rows - 1) * this.gap,
      ));

      const layout = this.gridRoot.addComponent(Layout);
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

      // 1) 底色：Graphics
      const bg = new Node('BG');
      bg.addComponent(UITransform);
      const g = bg.addComponent(Graphics);
      g.clear();
      g.fillColor = new Color(40, 40, 40, 180);
      const x = -this.cellSize / 2;
      const y = -this.cellSize / 2;
      g.roundRect(x, y, this.cellSize, this.cellSize, 6);
      g.fill();
      cell.addChild(bg);

      // 2) 图标（Sprite）
      const iconSpNode = new Node('IconSprite');
      const iconSpUI = iconSpNode.addComponent(UITransform);
      iconSpUI.setContentSize(this.cellSize - 12, this.cellSize - 12);
      iconSpNode.addComponent(Sprite);
      cell.addChild(iconSpNode);

      // 3) 文字占位（无图标时显示物品 id）
      const iconTextNode = new Node('IconText');
      const iconTextUI = iconTextNode.addComponent(UITransform);
      iconTextUI.setContentSize(this.cellSize - 12, this.cellSize - 12);
      const iconLb = iconTextNode.addComponent(Label);
      iconLb.string = '';
      iconLb.fontSize = 14;
      iconLb.lineHeight = 16;
      iconLb.color = new Color(220, 220, 220, 255);
      cell.addChild(iconTextNode);

      // 4) 数量（右下）
      const count = new Node('Count');
      count.addComponent(UITransform);
      const countLb = count.addComponent(Label);
      countLb.string = '';
      countLb.fontSize = 20;
      countLb.lineHeight = 22;
      countLb.color = new Color(255, 255, 255, 255);
      count.setPosition(new Vec3(this.cellSize / 2 - 12, -(this.cellSize / 2) + 12, 0));
      cell.addChild(count);

      this.gridRoot!.addChild(cell);
      this._cells.push(cell);
    }

    if (this.debugLog) console.log('[InvPanel] build grid cells =', this._cells.length);
  }

  /** 组装一份可显示的物品清单 */
  private _collectItems(): Array<{ id: string; count: number }> {
    const filled: Array<{ id: string, count: number }> = [];

    // 1) 优先：逐槽读取
    const inv = this._bridge.inventory;
    const slots = inv.slots || [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s && s.id && s.count > 0) filled.push({ id: s.id, count: s.count });
    }

    // 2) 回退：用 DB 的条目 + getItemCount 汇总（防止 slots 为空）
    if (filled.length === 0 && this._db && inv && typeof inv.getItemCount === 'function') {
      const allItems = (this._db.allItems || []) as any[];
      for (const data of allItems) {
        const id = data?.id;
        if (!id) continue;
        const c = inv.getItemCount(id);
        if (c > 0) filled.push({ id, count: c });
      }
    }
    return filled;
  }

  /** 周期刷新格子显示 */
  refresh = () => {
    if (!this._db && this.itemDBNode) this._db = this.itemDBNode.getComponent('ItemDatabase');
    if (!this._bridge && this.invBridgeNode) this._bridge = this.invBridgeNode.getComponent('PickupToInventory');
    if (!this._db || !this._bridge || !this._bridge.inventory) {
      if (this.debugLog && !this._readyLogged) {
        console.warn('[InvPanel] waiting... db=', !!this._db, 'bridge=', !!this._bridge, 'inv=', this._bridge && !!this._bridge.inventory);
      }
      return;
    }
    if (!this._readyLogged && this.debugLog) {
      this._readyLogged = true;
      console.log('[InvPanel] refresh start. slots size =', (this._bridge.inventory.slots || []).length);
    }

    const items = this._collectItems();
    const n = this._cells.length;
    let k = 0;

    for (let i = 0; i < n; i++) {
      const cell = this._cells[i];
      const iconSpNode = cell.getChildByName('IconSprite')!;
      const iconTextNode = cell.getChildByName('IconText')!;
      const countNode = cell.getChildByName('Count')!;
      const iconSp = iconSpNode.getComponent(Sprite)!;
      const iconLb = iconTextNode.getComponent(Label)!;
      const countLb = countNode.getComponent(Label)!;

      const entry = k < items.length ? items[k++] : null;

      if (entry) {
        const data = this._db.get ? this._db.get(entry.id) : null;
        const sf: SpriteFrame | null = data && data.icon ? (data.icon as SpriteFrame) : null;

        if (sf) {
          iconSp.spriteFrame = sf;
          iconSpNode.active = true;
          iconTextNode.active = false;
          iconLb.string = '';
        } else {
          iconSp.spriteFrame = null as any;
          iconSpNode.active = false;
          iconTextNode.active = true;
          iconLb.string = String(entry.id);
        }
        countLb.string = String(entry.count); // 1 也显示
      } else {
        iconSp.spriteFrame = null as any;
        iconSpNode.active = false;
        iconTextNode.active = false;
        countLb.string = '';
      }
    }
  }
}
