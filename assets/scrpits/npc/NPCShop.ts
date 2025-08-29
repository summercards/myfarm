/* assets/scrpits/npc/NPCShop.ts
 * NPC 商店入口：靠近按键打开/关闭商店 UI
 * - 不修改现有对话与背包；只需把本组件挂到 NPC 节点上。
 * - 需要：CurrencyManager、ItemDatabase、玩家节点(含 PickupToInventory)。
 */
import {
  _decorator, Component, Node, Prefab, instantiate, input, Input, EventKeyboard, KeyCode,
  Collider, ITriggerEvent, CCString, find
} from 'cc';
import { CurrencyManager } from '../currency/CurrencyManager';
import { ItemDatabase } from '../items/ItemDatabase';
import { ShopPanel } from '../ui/shop/ShopPanel';
const { ccclass, property } = _decorator;

/** 可序列化的商品配置（挂在 NPCShop 上编辑） */
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

  private _onEnter(e: ITriggerEvent) { this._inside = true; }
  private _onExit(e: ITriggerEvent) { this._inside = false; this.closeShop(); }

  private _onKey(e: EventKeyboard) {
    if (e.keyCode !== this.openKey) return;
    if (!this._inside) return;
    if (this._panelNode && this._panelNode.active) this.closeShop();
    else this.openShop();
  }

  /** 外部可调用：打开商店 */
  public openShop() {
    if (!this.itemDB || !this.currency || !this.player) {
      console.warn('[NPCShop] 缺少依赖 itemDB/currency/player');
      return;
    }
    if (!this._panelNode) {
      // 1) 如果你做了 prefab，则用它
      if (this.shopPanelPrefab) {
        this._panelNode = instantiate(this.shopPanelPrefab);
      } else {
        // 2) 否则动态创建
        this._panelNode = new Node('ShopPanel');
        this._panelNode.addComponent(ShopPanel);
      }
      // 放到 Canvas 下
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

  /** 外部可调用：关闭商店 */
  public closeShop() {
    if (this._panelNode) this._panelNode.active = false;
    // 如需关闭 InventoryPanel，自行在这里 invPanel.active=false
  }
}
