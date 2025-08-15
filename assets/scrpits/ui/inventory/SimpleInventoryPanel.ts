// scrpits/ui/inventory/SimpleInventoryPanel.ts
import {
    _decorator, Component, Node, UITransform, Graphics, Color,
    Label, Sprite, SpriteFrame, Size, Layers, EventTouch, EventMouse
} from 'cc';
import { PickupToInventory } from '../../items/adapters/PickupToInventory';
import { ItemDatabase } from '../../items/ItemDatabase';
const { ccclass, property } = _decorator;

@ccclass('SimpleInventoryPanel')
export class SimpleInventoryPanel extends Component {
    @property rows = 4;
    @property cols = 5;
    @property cellSize = 84;
    @property gap = 10;

    @property(Color) panelBg = new Color(0, 0, 0, 150);
    @property(Color) cellBg = new Color(40, 40, 40, 200);
    @property(Color) cellHl = new Color(255, 170, 0, 255); // 高亮描边色（橙色更明显）
    @property(Color) textCol = new Color(230, 230, 230, 255);

    @property(Node) invHolder: Node | null = null;  // 玩家（含 PickupToInventory）
    @property(Node) dbNode: Node | null = null;     // GameRoot（含 ItemDatabase）
    @property title = '背包';
    @property refreshInterval = 0.15;

    private _bridge: PickupToInventory | null = null;
    private _db: ItemDatabase | null = null;
    private _cells: Node[] = [];
    private _time = 0;

    onLoad() {
        const ui = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        if (ui.contentSize.width < 10 || ui.contentSize.height < 10) {
            ui.setContentSize(this.cols * this.cellSize + (this.cols - 1) * this.gap + 28,
                this.rows * this.cellSize + (this.rows - 1) * this.gap + 72);
        }

        this._bridge = this.invHolder?.getComponent(PickupToInventory) || null;
        this._db = this.dbNode?.getComponent(ItemDatabase) || null;

        this.buildBackground();
        this.buildGrid();
        this.refresh();
    }

    update(dt: number) {
        this._time += dt;
        if (this._time >= this.refreshInterval) {
            this._time = 0;
            this.refresh();
        }
    }

    private buildBackground() {
        const titleNode = new Node('Title');
        titleNode.layer = Layers.Enum.UI_2D;
        const tLabel = titleNode.addComponent(Label);
        tLabel.string = this.title;
        tLabel.color = this.textCol;
        tLabel.fontSize = 20;
        this.node.addChild(titleNode);

        const ui = this.node.getComponent(UITransform)!;
        titleNode.setPosition(0, ui.contentSize.height / 2 - 22);

        const bg = new Node('Bg');
        bg.layer = Layers.Enum.UI_2D;
        const g = bg.addComponent(Graphics);
        const w = ui.contentSize.width, h = ui.contentSize.height;
        g.fillColor = this.panelBg;
        g.roundRect(-w / 2, -h / 2, w, h, 12);
        g.fill();
        this.node.insertChild(bg, 0);
    }

    private buildGrid() {
        for (const n of this._cells) n.destroy();
        this._cells.length = 0;

        const root = new Node('Grid');
        this.node.addChild(root);

        const ui = this.node.getComponent(UITransform)!;
        const totalW = this.cols * this.cellSize + (this.cols - 1) * this.gap;
        const totalH = this.rows * this.cellSize + (this.rows - 1) * this.gap;
        const startX = -totalW / 2;
        const startY = totalH / 2;

        let idx = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = new Node(`Cell_${idx}`);
                cell.layer = Layers.Enum.UI_2D;
                const uiC = cell.addComponent(UITransform);
                uiC.setContentSize(new Size(this.cellSize, this.cellSize));
                cell.setPosition(startX + c * (this.cellSize + this.gap) + this.cellSize / 2,
                    startY - r * (this.cellSize + this.gap) - this.cellSize / 2);

                // 底色
                const g = cell.addComponent(Graphics);
                g.fillColor = this.cellBg;
                g.roundRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 8);
                g.fill();

                // 图标
                const iconNode = new Node('Icon');
                const icon = iconNode.addComponent(Sprite);
                cell.addChild(iconNode);

                // 文本（显示数量或ID）
                const txtNode = new Node('Text');
                const label = txtNode.addComponent(Label);
                label.color = this.textCol;
                label.fontSize = 16;
                txtNode.setPosition(0, -this.cellSize / 2 + 14);
                cell.addChild(txtNode);

                // 选中描边
                const sel = new Node('Sel');
                const gs = sel.addComponent(Graphics);
                gs.lineWidth = 3;
                gs.strokeColor = this.cellHl;
                gs.roundRect(-this.cellSize / 2 + 2, -this.cellSize / 2 + 2, this.cellSize - 4, this.cellSize - 4, 8);
                gs.stroke();
                sel.active = false;
                cell.addChild(sel);

                // 点击切换（同时支持触摸与鼠标）
                cell.on(Node.EventType.TOUCH_END, () => this.onCellClick(idx), this);
                cell.on(Node.EventType.MOUSE_UP, () => this.onCellClick(idx), this);

                this._cells.push(cell);
                root.addChild(cell);
                idx++;
            }
        }
    }

    private onCellClick(index: number) {
        const inv = this._bridge?.inventory;
        if (!inv) return;
        const ok = inv.select(index);     // 非空格才会成功
        if (!ok) inv.selectedIndex = -1;  // 点空格 = 取消选择
        this.refresh();
    }

    private refresh() {
        const inv = this._bridge?.inventory;
        const db = this._db;
        if (!inv || !db) return;

        for (let i = 0; i < this._cells.length; i++) {
            const cell = this._cells[i];
            const icon = cell.getChildByName('Icon')?.getComponent(Sprite)!;
            const text = cell.getChildByName('Text')?.getComponent(Label)!;
            const sel = cell.getChildByName('Sel')!;

            const stack = inv.slots[i];
            if (stack) {
                const data: any = db.get(stack.id);
                const sf: SpriteFrame | null | undefined = data?.icon;
                const displayName: string = data?.displayName || stack.id;
                icon.spriteFrame = sf || null;
                icon.node.active = !!sf;
                text.string = sf ? `${stack.count}` : `${displayName} ${stack.count}`;
            } else {
                icon.spriteFrame = null;
                icon.node.active = false;
                text.string = '';
            }
            sel.active = (i === inv.selectedIndex);
        }
    }
}
