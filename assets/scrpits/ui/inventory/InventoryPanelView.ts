import {
    _decorator,
    Component,
    Node,
    UITransform,
    Widget,
    Graphics,
    Color,
    Layers,
    Label,
    Sprite,
    SpriteFrame,
    Size,
} from 'cc';

const { ccclass, property } = _decorator;

/**
 * InventoryPanelView（合并版）
 * - 固定渲染在 UI_2D 画布上（顶左角 Widget），背景与格子用 Graphics 画，必然可见
 * - 从玩家身上的 PickupToInventory（invBridgeNode）与 GameRoot 的 ItemDatabase（itemDBNode）读取数据
 * - 显示：图标 +（可选）名称 + 数量（数量=1时也显示/可改）
 */
@ccclass('InventoryPanelView')
export class InventoryPanelView extends Component {
    /** 行 */
    @property rows: number = 4;
    /** 列 */
    @property cols: number = 5;
    /** 单元格像素 */
    @property cellSize: number = 84;
    /** 间距 */
    @property gap: number = 10;

    /** 面板背景色（半透明） */
    @property(Color) panelBgColor: Color = new Color(0, 0, 0, 120);
    /** 格子底色 */
    @property(Color) cellBgColor: Color = new Color(40, 40, 40, 180);
    /** 物品名颜色 */
    @property(Color) nameColor: Color = new Color(220, 220, 220, 255);
    /** 数量颜色 */
    @property(Color) countColor: Color = new Color(255, 255, 255, 255);

    /** （可选）是否显示物品名 */
    @property showName: boolean = true;
    /** 数量==1时是否也显示 */
    @property showOneCount: boolean = true;

    /** GameRoot（挂 ItemDatabase） */
    @property(Node) itemDBNode: Node | null = null;
    /** 玩家（挂 PickupToInventory） */
    @property(Node) invBridgeNode: Node | null = null;

    private _grid!: Node;
    private _cells: Array<{
        root: Node;
        icon: Sprite;
        name?: Label;
        count: Label;
    }> = [];

    private _itemDB: any = null;     // ItemDatabase
    private _bridge: any = null;     // PickupToInventory

    onLoad() {
        // 1) 确保在 UI 图层
        this.node.layer = Layers.Enum.UI_2D;

        // 2) 计算面板整体宽高（四周 16px 内边距）
        const pad = 16;
        const w = this.cols * this.cellSize + (this.cols - 1) * this.gap + pad * 2;
        const h = this.rows * this.cellSize + (this.rows - 1) * this.gap + pad * 2;

        // 3) UITransform + Widget，固定到屏幕左上角
        const ui = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        ui.setContentSize(w, h);

        const widget = this.node.getComponent(Widget) ?? this.node.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAlignLeft = true;
        widget.top = 30;
        widget.left = 30;
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;

        // 4) 面板背景（圆角矩形）
        const bg = new Node('PanelBG');
        bg.layer = Layers.Enum.UI_2D;
        const bgUI = bg.addComponent(UITransform);
        bgUI.setAnchorPoint(0, 1); // 左上角为锚点
        bgUI.setContentSize(w, h);
        const g = bg.addComponent(Graphics);
        g.fillColor = this.panelBgColor;
        g.roundRect(0, 0, w, h, 12);
        g.fill();
        // 父锚点 0.5,0.5 -> 把左上对齐到父节点中心
        bg.setPosition(-w / 2, h / 2);
        this.node.addChild(bg);

        // 5) 网格根节点（放格子）
        this._grid = new Node('Grid');
        this._grid.layer = Layers.Enum.UI_2D;
        const gridUI = this._grid.addComponent(UITransform);
        gridUI.setAnchorPoint(0, 1);
        gridUI.setContentSize(w - pad * 2, h - pad * 2);
        this._grid.setPosition(-w / 2 + pad, h / 2 - pad);
        this.node.addChild(this._grid);

        // 6) 生成格子
        this._buildGrid();

        // 7) 尝试绑定 DB / Bridge
        if (this.itemDBNode) this._itemDB = this.itemDBNode.getComponent('ItemDatabase');
        if (this.invBridgeNode) this._bridge = this.invBridgeNode.getComponent('PickupToInventory');

        // 8) 定时刷新（简单稳定）
        this.schedule(this.refresh, 0.2);
    }

    private _buildGrid() {
        // 清空旧格子
        for (const c of this._cells) c.root.destroy();
        this._cells.length = 0;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const idx = r * this.cols + c;

                const cell = new Node(`Cell_${idx}`);
                cell.layer = Layers.Enum.UI_2D;

                const cui = cell.addComponent(UITransform);
                cui.setAnchorPoint(0.5, 0.5);
                cui.setContentSize(this.cellSize, this.cellSize);

                // 底色（Graphics 画圆角矩形）
                const cg = cell.addComponent(Graphics);
                cg.fillColor = this.cellBgColor;
                const half = this.cellSize / 2;
                cg.roundRect(-half, -half, this.cellSize, this.cellSize, 8);
                cg.fill();

                // 图标
                const iconNode = new Node('Icon');
                iconNode.layer = Layers.Enum.UI_2D;
                const iconUI = iconNode.addComponent(UITransform);
                iconUI.setContentSize(this.cellSize - 14, this.cellSize - 34);
                const icon = iconNode.addComponent(Sprite);
                iconNode.setPosition(0, 8, 0);
                cell.addChild(iconNode);

                // 名称（可选，底部居中）
                let nameLb: Label | undefined;
                if (this.showName) {
                    const nameNode = new Node('Name');
                    nameNode.layer = Layers.Enum.UI_2D;
                    const nUI = nameNode.addComponent(UITransform);
                    nUI.setContentSize(this.cellSize - 14, 22);
                    nameLb = nameNode.addComponent(Label);
                    nameLb.string = '';
                    nameLb.fontSize = 16;
                    nameLb.lineHeight = 18;
                    nameLb.color = this.nameColor;
                    nameLb.horizontalAlign = Label.HorizontalAlign.CENTER;
                    nameLb.verticalAlign = Label.VerticalAlign.CENTER;
                    nameNode.setPosition(0, -this.cellSize / 2 + 14, 0);
                    cell.addChild(nameNode);
                }

                // 数量（右下角）
                const cntNode = new Node('Count');
                cntNode.layer = Layers.Enum.UI_2D;
                const cntUI = cntNode.addComponent(UITransform);
                cntUI.setContentSize(40, 22);
                const countLb = cntNode.addComponent(Label);
                countLb.string = '';
                countLb.fontSize = 20;
                countLb.lineHeight = 22;
                countLb.color = this.countColor;
                countLb.horizontalAlign = Label.HorizontalAlign.RIGHT;
                countLb.verticalAlign = Label.VerticalAlign.CENTER;
                cntNode.setPosition(this.cellSize / 2 - 12, -(this.cellSize / 2) + 12, 0);
                cell.addChild(cntNode);

                // 放入网格
                const x = c * (this.cellSize + this.gap) + half;
                const y = -(r * (this.cellSize + this.gap) + half);
                cell.setPosition(x, y);
                this._grid.addChild(cell);

                this._cells.push({ root: cell, icon, name: nameLb, count: countLb });
            }
        }
    }

    /** 拉取玩家背包并刷新格子 */
    refresh() {
        // 没绑定就清空显示（保持 UI 可见）
        if (!this._bridge || !this._itemDB) {
            for (const c of this._cells) {
                c.icon.spriteFrame = null as any;
                c.icon.node.active = false;
                if (c.name) c.name.string = '';
                c.count.string = '';
            }
            return;
        }

        const inv = this._bridge.inventory;
        if (!inv || !inv.slots) return;

        const capacity = Math.min(this._cells.length, inv.slots.length);
        for (let i = 0; i < capacity; i++) {
            const slot = inv.slots[i];
            const cell = this._cells[i];
            if (slot) {
                const data = this._itemDB.get(slot.id); // 期望 data: { name?: string, icon?: SpriteFrame }
                cell.icon.spriteFrame = (data && data.icon) ? (data.icon as SpriteFrame) : null;
                cell.icon.node.active = !!cell.icon.spriteFrame;

                if (cell.name) cell.name.string = (data && data.name) ? data.name : slot.id;
                cell.count.string = this.showOneCount ? String(slot.count) : (slot.count > 1 ? String(slot.count) : '');
            } else {
                cell.icon.spriteFrame = null as any;
                cell.icon.node.active = false;
                if (cell.name) cell.name.string = '';
                cell.count.string = '';
            }
        }
        // 超出容量的格子清空
        for (let i = capacity; i < this._cells.length; i++) {
            const cell = this._cells[i];
            cell.icon.spriteFrame = null as any;
            cell.icon.node.active = false;
            if (cell.name) cell.name.string = '';
            cell.count.string = '';
        }
    }
}
