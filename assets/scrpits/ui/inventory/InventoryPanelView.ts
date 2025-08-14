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
    SpriteAtlas,
} from 'cc';

const { ccclass, property } = _decorator;

type Slot = { id: string; count: number };

/**
 * InventoryPanelView（稳健版）
 * - 固定渲染在 UI_2D 画布上（左上角）
 * - 从 invBridgeNode(PickupToInventory) 与 itemDBNode(ItemDatabase) 读取数据
 * - 名称/图标读取做了兼容（避免出现 apple<ItemData>）
 */
@ccclass('InventoryPanelView')
export class InventoryPanelView extends Component {
    /** 行/列/尺寸/间距 */
    @property rows = 4;
    @property cols = 5;
    @property cellSize = 84;
    @property gap = 10;

    /** 颜色 */
    @property(Color) panelBgColor: Color = new Color(0, 0, 0, 120);
    @property(Color) cellBgColor: Color = new Color(40, 40, 40, 180);
    @property(Color) nameColor: Color = new Color(220, 220, 220, 255);
    @property(Color) countColor: Color = new Color(255, 255, 255, 255);

    /** 是否显示物品名、数量=1是否也显示 */
    @property showName = true;
    @property showOneCount = true;

    /** 资源与桥接 */
    @property(Node) itemDBNode: Node | null = null;      // GameRoot（挂 ItemDatabase）
    @property(Node) invBridgeNode: Node | null = null;   // 玩家（挂 PickupToInventory）
    @property(SpriteAtlas) iconAtlas: SpriteAtlas | null = null; // 可选：如果 DB 的 icon 是字符串，则用此图集取帧

    private _grid!: Node;
    private _cells: Array<{
        root: Node;
        icon: Sprite;
        name?: Label;
        count: Label;
    }> = [];

    private _itemDB: any = null;  // ItemDatabase（不同项目结构不同，这里做兼容读取）
    private _bridge: any = null;  // PickupToInventory

    onLoad() {
        // 在 UI_2D 图层
        this.node.layer = Layers.Enum.UI_2D;

        // 面板尺寸（含内边距）
        const pad = 16;
        const w = this.cols * this.cellSize + (this.cols - 1) * this.gap + pad * 2;
        const h = this.rows * this.cellSize + (this.rows - 1) * this.gap + pad * 2;

        // UITransform + Widget（左上角）
        const ui = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        ui.setContentSize(w, h);

        const widget = this.node.getComponent(Widget) ?? this.node.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAlignLeft = true;
        widget.top = 30;
        widget.left = 30;
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;

        // 背景
        const bg = new Node('PanelBG');
        bg.layer = Layers.Enum.UI_2D;
        const bgUI = bg.addComponent(UITransform);
        bgUI.setAnchorPoint(0, 1);
        bgUI.setContentSize(w, h);
        const g = bg.addComponent(Graphics);
        g.fillColor = this.panelBgColor;
        g.roundRect(0, 0, w, h, 12);
        g.fill();
        bg.setPosition(-w / 2, h / 2);
        this.node.addChild(bg);

        // 网格
        this._grid = new Node('Grid');
        this._grid.layer = Layers.Enum.UI_2D;
        const gridUI = this._grid.addComponent(UITransform);
        gridUI.setAnchorPoint(0, 1);
        gridUI.setContentSize(w - pad * 2, h - pad * 2);
        this._grid.setPosition(-w / 2 + pad, h / 2 - pad);
        this.node.addChild(this._grid);

        this._buildGrid();

        // 绑定 DB / Bridge
        if (this.itemDBNode) this._itemDB = this.itemDBNode.getComponent('ItemDatabase');
        if (this.invBridgeNode) this._bridge = this.invBridgeNode.getComponent('PickupToInventory');

        // 立即刷新一次 + 定时刷新
        this.refresh();
        this.schedule(this.refresh, 0.2);
    }

    private _buildGrid() {
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

                // 背板
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

                // 名称
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

                // 数量（右下）
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

    /** 统一从 DB 里按 id 找条目（兼容多种组织方式） */
    private _getItemData(id: string): any {
        const db = this._itemDB;
        if (!db) return null;

        try {
            if (typeof db.get === 'function') {
                const v = db.get(id);
                if (v) return v;
            }
        } catch { }

        if (db.byId && db.byId[id]) return db.byId[id];
        if (db.map && db.map[id]) return db.map[id];

        const arr = db.items || db.list || db.data;
        if (Array.isArray(arr)) {
            const v = arr.find((x: any) => x && x.id === id);
            if (v) return v;
        }
        return null;
    }

    /** 从 data 中提取名字（string），否则回退为 id */
    private _getDisplayName(data: any, idFallback: string): string {
        if (!data) return idFallback;
        const candidates = [data.displayName, data.name, data.title, data.label];
        for (const s of candidates) {
            if (typeof s === 'string' && s.length > 0) return s;
        }
        return idFallback;
    }

    /** 从 data 中提取图标帧：SpriteFrame 或字符串名 + 图集 */
    private _getIconFrame(data: any): SpriteFrame | null {
        if (!data) return null;

        const sfCandidates = [data.icon, data.iconFrame, data.spriteFrame];
        for (const v of sfCandidates) {
            if (v instanceof SpriteFrame) return v;
        }

        // icon 是字符串名，且有图集
        const nameCandidates = [data.icon, data.iconName];
        for (const n of nameCandidates) {
            if (typeof n === 'string' && n && this.iconAtlas) {
                const f = this.iconAtlas.getSpriteFrame(n);
                if (f) return f;
            }
        }
        return null;
    }

    /** 刷新格子显示 */
    refresh() {
        const bridge = this._bridge;
        const db = this._itemDB;

        // 未绑定：清空显示
        if (!bridge || !db) {
            for (const c of this._cells) {
                c.icon.spriteFrame = null as any;
                c.icon.node.active = false;
                if (c.name) c.name.string = '';
                c.count.string = '';
            }
            return;
        }

        const inv = bridge.inventory;
        if (!inv || !inv.slots) return;

        const slots: Array<Slot | null> = inv.slots as any;
        const capacity = Math.min(this._cells.length, slots.length);

        for (let i = 0; i < capacity; i++) {
            const slot = slots[i];
            const cell = this._cells[i];

            if (slot && slot.id) {
                const data = this._getItemData(slot.id);
                const frame = this._getIconFrame(data);
                cell.icon.spriteFrame = frame;
                cell.icon.node.active = !!frame;

                if (cell.name) cell.name.string = this._getDisplayName(data, slot.id);
                cell.count.string = this.showOneCount
                    ? String(slot.count)
                    : (slot.count > 1 ? String(slot.count) : '');
            } else {
                cell.icon.spriteFrame = null as any;
                cell.icon.node.active = false;
                if (cell.name) cell.name.string = '';
                cell.count.string = '';
            }
        }

        // 多余格子清空
        for (let i = capacity; i < this._cells.length; i++) {
            const cell = this._cells[i];
            cell.icon.spriteFrame = null as any;
            cell.icon.node.active = false;
            if (cell.name) cell.name.string = '';
            cell.count.string = '';
        }
    }
}
