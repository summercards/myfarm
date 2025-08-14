import {
  _decorator, Component, Node, UITransform, Layout, Size,
  Label, Color, Graphics, Vec3, Sprite, SpriteFrame
} from 'cc';
import { UIBus, UIEvents, UIItem } from '../core/UIBus';
const { ccclass, property } = _decorator;

/**
 * 独立背包面板：只订阅 UIBus，不直接访问数据库/玩家
 * - Graphics 画面板与格子底色（半透明，必可见）
 * - 每格：图标(可选) + 名称 + 数量（1 也显示）
 */
@ccclass('InventoryPanelView')
export class InventoryPanelView extends Component {
  @property rows = 4;
  @property cols = 5;
  @property cellSize = 84;
  @property gap = 10;

  @property(Color) panelBgColor = new Color(0, 0, 0, 120);
  @property(Color) cellBgColor  = new Color(40, 40, 40, 180);
  @property(Color) nameColor    = new Color(220, 220, 220, 255);
  @property(Color) countColor   = new Color(255, 255, 255, 255);

  private _gridRoot: Node | null = null;
  private _cells: Node[] = [];
  private _isOpen = true;

  onLoad() {
    // 面板尺寸（没有就给默认）
    const ui = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
    if (ui.contentSize.width < 10 || ui.contentSize.height < 10) ui.setContentSize(640, 420);

    this._drawPanelBG();
    this._buildGrid();

    // 订阅总线事件
    UIBus.on(UIEvents.InventoryChanged, this.onInventoryChanged, this);
    UIBus.on(UIEvents.Open,  () => this.setOpen(true),  this);
    UIBus.on(UIEvents.Close, () => this.setOpen(false), this);
    UIBus.on(UIEvents.Toggle,() => this.setOpen(!this._isOpen), this);
  }

  onDestroy() {
    UIBus.off(UIEvents.InventoryChanged, this.onInventoryChanged, this);
  }

  private setOpen(v: boolean) {
    this._isOpen = v;
    this.node.active = v;
  }

  private _drawPanelBG() {
    let bg = this.node.getChildByName('PanelBG');
    if (!bg) {
      bg = new Node('PanelBG');
      this.node.addChild(bg);
      bg.addComponent(UITransform);
      bg.addComponent(Graphics);
    }
    const pad = 16;
    const w = this.cols * this.cellSize + (this.cols - 1) * this.gap + pad * 2;
    const h = this.rows * this.cellSize + (this.rows - 1) * this.gap + pad * 2;

    const g = bg.getComponent(Graphics)!;
    g.clear();
    g.fillColor = this.panelBgColor;
    g.roundRect(-w / 2, -h / 2, w, h, 10);
    g.fill();
  }

  private _buildGrid() {
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
      g.fillColor = this.cellBgColor;
      g.clear();
      g.roundRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 8);
      g.fill();
      cell.addChild(bg);

      // 图标（可选）
      const icon = new Node('Icon');
      const iconUI = icon.addComponent(UITransform);
      iconUI.setContentSize(this.cellSize - 14, this.cellSize - 34);
      icon.addComponent(Sprite);
      icon.setPosition(new Vec3(0, 8, 0));
      cell.addChild(icon);

      // 名称（底部居中）
      const name = new Node('Name');
      const nUI = name.addComponent(UITransform);
      nUI.setContentSize(this.cellSize - 14, 24);
      const nLb = name.addComponent(Label);
      nLb.string = '';
      nLb.fontSize = 16;
      nLb.lineHeight = 18;
      nLb.color = this.nameColor;
      name.setPosition(new Vec3(0, -this.cellSize / 2 + 14, 0));
      cell.addChild(name);

      // 数量（右下角）
      const cnt = new Node('Count');
      cnt.addComponent(UITransform);
      const cLb = cnt.addComponent(Label);
      cLb.string = '';
      cLb.fontSize = 20;
      cLb.lineHeight = 22;
      cLb.color = this.countColor;
      cnt.setPosition(new Vec3(this.cellSize / 2 - 12, -(this.cellSize / 2) + 12, 0));
      cell.addChild(cnt);

      this._gridRoot!.addChild(cell);
      this._cells.push(cell);
    }
  }

  /** 接收 UIItem[] 并渲染 */
  private onInventoryChanged = (items: UIItem[]) => {
    let k = 0;
    for (let i = 0; i < this._cells.length; i++) {
      const cell = this._cells[i];
      const iconSp  = cell.getChildByName('Icon')?.getComponent(Sprite);
      const nameLb  = cell.getChildByName('Name')?.getComponent(Label);
      const countLb = cell.getChildByName('Count')?.getComponent(Label);

      const it = k < items.length ? items[k++] : null;
      if (it && nameLb && countLb) {
        nameLb.string = it.name || it.id;
        countLb.string = String(it.count);

        if (iconSp) {
          if (it.icon) {
            iconSp.spriteFrame = it.icon as SpriteFrame;
            iconSp.node.active = true;
          } else {
            iconSp.spriteFrame = null as any;
            iconSp.node.active = false;
          }
        }
      } else {
        if (nameLb)  nameLb.string = '';
        if (countLb) countLb.string = '';
        if (iconSp) {
          iconSp.spriteFrame = null as any;
          iconSp.node.active = false;
        }
      }
    }
  }
}
