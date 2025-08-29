/* assets/scrpits/ui/shop/ShopPanel.ts
 * 简易商店面板（代码动态构建 UI）
 * - 左侧：NPC 商品列表（点击=购买 1 个）
 * - 右侧：玩家背包（点击=出售 1 个）
 */
import {
  _decorator, Component, Node, Label, UITransform, Widget,
  Button, Layout, Vec3, input, Input, EventKeyboard, KeyCode
} from 'cc';
import { CurrencyManager } from '../../currency/CurrencyManager';
import { ItemDatabase } from '../../items/ItemDatabase';
import { NPCShop, ShopGoodDef } from '../../npc/NPCShop';
const { ccclass, property } = _decorator;

type Inv = any;        // 兼容你现有 Inventory 结构
type ItemStack = any;  // { id: string, count: number }

import { Component } from 'cc';  // 顶部已导入的话可忽略

function add<T extends Component>(n: Node, Ctor: new () => T): T {
  return n.addComponent(Ctor);
}


@ccclass('ShopPanel')
export class ShopPanel extends Component {
  @property(ItemDatabase) itemDB: ItemDatabase | null = null;
  @property(CurrencyManager) currency: CurrencyManager | null = null;
  @property(Node) player: Node | null = null; // 玩家节点（含 PickupToInventory）
  @property(NPCShop) npc: NPCShop | null = null;

  private _bg!: Node;
  private _npcBox!: Node;
  private _playerBox!: Node;
  private _coinLabel!: Label;
  private _goods: ShopGoodDef[] = [];

  onLoad() {
    this._buildUI();
    // Esc 关闭
    input.on(Input.EventType.KEY_DOWN, (e: EventKeyboard)=>{
      if (e.keyCode === KeyCode.ESCAPE) this.npc?.closeShop();
    }, this);
  }

  onEnable() { this.refreshAll(); }

  setGoods(g: ShopGoodDef[]) { this._goods = g || []; }

  /** 刷新两边列表与金币文本 */
  public refreshAll() {
    this._refreshCoins();
    this._refreshNpcList();
    this._refreshPlayerList();
  }

  private _getInventory(): Inv | null {
    const bridge = this.player?.getComponent('PickupToInventory') as any;
    return bridge?.inventory ?? null;
  }

  private _refreshCoins() {
    if (this._coinLabel && this.currency) {
      this._coinLabel.string = `金币：${this.currency.coins | 0}`;
    }
  }

  private _refreshNpcList() {
    this._npcBox.removeAllChildren();
    for (const g of this._goods) {
      const d = this.itemDB?.get(g.id) as any;
      if (!d) continue;
      const name = d.displayName || g.id;
      const row = this._makeRow(`${name}    价格:${g.buyPrice}${g.stock<0?'':'  库存:'+g.stock}`);
      // 点击购买 1 个
      row.on(Node.EventType.TOUCH_END, () => this._tryBuy(g));
      this._npcBox.addChild(row);
    }
  }

  private _refreshPlayerList() {
    this._playerBox.removeAllChildren();
    const inv = this._getInventory();
    if (!inv) return;
    const slots: ItemStack[] = inv.slots || [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (!s) continue;
      const d = this.itemDB?.get(s.id) as any;
      const name = d?.displayName || s.id;
      const price = d?.sellPrice ?? 0;
      const row = this._makeRow(`${name} ×${s.count}    卖价:${price}`);
      // 点击出售 1 个
      row.on(Node.EventType.TOUCH_END, () => this._trySell(i));
      this._playerBox.addChild(row);
    }
  }

  private _tryBuy(g: ShopGoodDef) {
    if (!this.currency || !this.itemDB) return;
    if (g.stock === 0) return;
    if (!this.currency.trySpend(g.buyPrice)) { this._toast('金币不足'); return; }

    const inv = this._getInventory();
    if (!inv) { this._toast('找不到背包'); this.currency.addCoins(g.buyPrice); return; }

    const ok = this._addToInv(inv, g.id, 1);
    if (!ok) { this._toast('背包已满'); this.currency.addCoins(g.buyPrice); return; }
    if (g.stock > 0) g.stock -= 1;
    this.refreshAll();
  }

  private _trySell(slotIndex: number) {
    if (!this.currency || !this.itemDB) return;
    const inv = this._getInventory();
    if (!inv) return;
    const slots: ItemStack[] = inv.slots || [];
    const s = slots[slotIndex];
    if (!s) return;
    const d = this.itemDB.get(s.id) as any;
    const price = d?.sellPrice ?? 0;
    const canSell = (d?.canSell ?? (price > 0)) && price > 0;
    if (!canSell) { this._toast('该物品不可出售'); return; }

    s.count -= 1;
    if (s.count <= 0) slots[slotIndex] = null;
    inv.slots = slots; // 写回
    this.currency.addCoins(price);
    this.refreshAll();
  }

  /** 背包添加：同 id 叠加，否则找空位 */
  private _addToInv(inv: Inv, id: string, count: number): boolean {
    const slots: ItemStack[] = inv.slots || [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s && s.id === id) { s.count += count; inv.slots = slots; return true; }
    }
    for (let i = 0; i < slots.length; i++) {
      if (!slots[i]) { slots[i] = { id, count }; inv.slots = slots; return true; }
    }
    return false;
  }

  private _toast(msg: string) {
    // 这里先简单打印；如果你有 InteractHint，可在此接入
    console.log('[ShopPanel]', msg);
  }

  /* ---------------- UI 构建 ---------------- */
  private _buildUI() {
    // 全屏根节点（跟随 Canvas 尺寸）
    const bg = this._bg = new Node('bg');
    this.node.addChild(bg);
    const t = add(bg, UITransform); t.setContentSize(1280, 720);
    const w = add(bg, Widget);
    w.isAlignLeft = w.isAlignRight = w.isAlignTop = w.isAlignBottom = true;
    w.left = w.right = w.top = w.bottom = 0;

    // 顶部金币
    const coin = this._makeLabel('金币：0', 22);
    coin.node.setPosition(new Vec3(480, 280));
    bg.addChild(coin.node);
    this._coinLabel = coin;

    // 左：NPC 商品列表
    const left = this._npcBox = new Node('npcBox');
    const lt = add(left, UITransform); lt.setContentSize(500, 520);
    const lw = add(left, Widget); lw.isAlignLeft = true; lw.left = 40; lw.isAlignTop = true; lw.top = 80;
    const ll = add(left, Layout); ll.type = Layout.Type.VERTICAL; ll.spacingY = 6;
    bg.addChild(left);
    const ltitle = this._makeLabel('NPC 商品（点击购买）', 22); ltitle.node.setPosition(new Vec3(-300, 280)); bg.addChild(ltitle.node);

    // 右：玩家背包列表
    const right = this._playerBox = new Node('playerBox');
    const rt = add(right, UITransform); rt.setContentSize(500, 520);
    const rw = add(right, Widget); rw.isAlignRight = true; rw.right = 40; rw.isAlignTop = true; rw.top = 80;
    const rl = add(right, Layout); rl.type = Layout.Type.VERTICAL; rl.spacingY = 6;
    bg.addChild(right);
    const rtitle = this._makeLabel('玩家背包（点击出售 1 个）', 22); rtitle.node.setPosition(new Vec3(220, 280)); bg.addChild(rtitle.node);

    // 关闭按钮
    const close = this._makeButton('关闭', ()=> this.npc?.closeShop());
    close.setPosition(new Vec3(0, -300));
    bg.addChild(close);
  }

  private _makeRow(text: string): Node {
    const row = new Node('row');
    const ui = add(row, UITransform); ui.setContentSize(500, 36);
    const btn = add(row, Button);
    const lab = this._makeLabel(text, 20);
    lab.node.setPosition(new Vec3(-230, 0));
    lab.horizontalAlign = Label.HorizontalAlign.LEFT;
    row.addChild(lab.node);
    return row;
  }

  private _makeLabel(text: string, fontSize: number): Label {
    const n = new Node('label');
    const ui = add(n, UITransform); ui.setContentSize(120, 30);
    const lb = add(n, Label); lb.string = text; lb.fontSize = fontSize;
    lb.lineHeight = fontSize + 8;
    return lb;
  }

  private _makeButton(text: string, onClick: ()=>void): Node {
    const n = new Node('button');
    const ui = add(n, UITransform); ui.setContentSize(120, 40);
    const btn = add(n, Button);
    const lab = this._makeLabel(text, 22);
    lab.node.setPosition(new Vec3(0, 0));
    lab.horizontalAlign = Label.HorizontalAlign.CENTER;
    n.addChild(lab.node);
    n.on(Node.EventType.TOUCH_END, onClick);
    return n;
  }
}
