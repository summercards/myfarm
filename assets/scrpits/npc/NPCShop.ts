/* assets/scrpits/npc/NPCShop.ts */
import {
    _decorator, Component, Node, Prefab, instantiate, input, Input, EventKeyboard, KeyCode,
    Collider, ITriggerEvent, CCString, find
} from 'cc';
import { CurrencyManager } from '../currency/CurrencyManager';
// ✅ 从 scrpits/npc 到 scrpits/items/ui/ItemDatabase.ts
import { ItemDatabase } from '../items/ItemDatabase';
import { ShopPanel } from '../ui/shop/ShopPanel';
const { ccclass, property } = _decorator;

@ccclass('ShopGoodDef')
export class ShopGoodDef {
    @property({ type: CCString, tooltip: '物品 id（与 ItemDatabase 中一致）' })
    id: string = '';
    @property({ tooltip: '购买单价（玩家 -> 购买）' })
    buyPrice: number = 10;
    @property({ tooltip: '库存（-1 = 无限）' })
    stock: number = -1;
}

@ccclass('NPCShop')
export class NPCShop extends Component {
    @property({ type: ItemDatabase }) itemDB: ItemDatabase | null = null;
    @property({ type: CurrencyManager }) currency: CurrencyManager | null = null;
    @property({ type: Node, tooltip: '玩家（身上需要有 PickupToInventory 组件）' }) player: Node | null = null;

    @property({ type: Collider, tooltip: '触发器（默认取本节点）' }) trigger: Collider | null = null;
    @property({ type: Prefab, tooltip: '可选：ShopPanel 的 Prefab；留空则代码动态创建' }) shopPanelPrefab: Prefab | null = null;

    @property({ type: [ShopGoodDef], tooltip: '该 NPC 出售的商品清单' })
    goods: ShopGoodDef[] = [];

    @property({ type: KeyCode, tooltip: '打开/关闭商店的按键' })
    openKey: KeyCode = KeyCode.KEY_E;

    @property({ tooltip: '打开时是否顺带显示 Canvas/InventoryPanel' })
    alsoOpenInventoryUI: boolean = true;

    private _inside = false;
    private _panelNode: Node | null = null;

    onLoad() {
        if (!this.trigger) this.trigger = this.getComponent(Collider) || null;
        if (!this.itemDB) this.itemDB = find('GameRoot')?.getComponent(ItemDatabase) ?? null;
        if (!this.currency) this.currency = find('GameRoot')?.getComponent(CurrencyManager) ?? null;
    }

    onEnable() {
        input.on(Input.EventType.KEY_DOWN, this._onKey, this);
        if (this.trigger) {
            this.trigger.on('onTriggerEnter', this._onEnter, this);
            this.trigger.on('onTriggerExit', this._onExit, this);
        }
    }
    onDisable() {
        input.off(Input.EventType.KEY_DOWN, this._onKey, this);
        if (this.trigger) {
            this.trigger.off('onTriggerEnter', this._onEnter, this);
            this.trigger.off('onTriggerExit', this._onExit, this);
        }
        this.closeShop();
    }

    private _onEnter() { this._inside = true; }
    private _onExit() { this._inside = false; this.closeShop(); }

    private _onKey(e: EventKeyboard) {
        if (e.keyCode !== this.openKey) return;
        if (!this._inside) return;
        if (this._panelNode && this._panelNode.active) this.closeShop();
        else this.openShop();
    }

    public openShop() {
        if (!this.itemDB || !this.currency || !this.player) {
            console.warn('[NPCShop] 缺少依赖 itemDB/currency/player');
            return;
        }
        if (!this._panelNode) {
            this._panelNode = this.shopPanelPrefab ? instantiate(this.shopPanelPrefab) : new Node('ShopPanel');
            if (!this.shopPanelPrefab) this._panelNode.addComponent(ShopPanel);
            const canvas = find('Canvas') || this.node.scene.getChildByName('Canvas');
            (canvas || this.node.scene).addChild(this._panelNode);
        }
        const panel = this._panelNode.getComponent(ShopPanel)!;
        panel.itemDB = this.itemDB;
        panel.currency = this.currency;
        panel.player = this.player;
        panel.npc = this;
        panel.setGoods(this.goods);
        this._panelNode.active = true;
        panel.refreshAll();

        if (this.alsoOpenInventoryUI) {
            const invPanel = find('Canvas/InventoryPanel');
            if (invPanel) invPanel.active = true;
        }
    }

    public closeShop() {
        if (this._panelNode) this._panelNode.active = false;
    }
}
