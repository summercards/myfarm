/* assets/scrpits/npc/NPCVendor.ts
 * NPC 贩售（出售）组件——靠近后按 T 键把背包里“可出售”的物品全部卖出换金币
 * 设计目标：最小侵入，不修改你现有对话/背包结构；只要把本组件挂到 NPC 节点即可。
 * 依赖：ItemDatabase、PickupToInventory、CurrencyManager
 */
import {
  _decorator, Component, Node, CCString, Enum, KeyCode,
  input, Input, EventKeyboard, Collider, ITriggerEvent, find
} from 'cc';
import { ItemDatabase } from '../items/ItemDatabase';
import { ItemCategory } from '../items/ItemCategory';
import { CurrencyManager } from '../currency/CurrencyManager';
import { InteractHint } from '../ui/InteractHint';
const { ccclass, property } = _decorator;

@ccclass('NPCVendor')
export class NPCVendor extends Component {
  @property({ type: ItemDatabase }) itemDB: ItemDatabase | null = null;
  @property({ type: Node, tooltip: '玩家节点（挂有 PickupToInventory）' }) player: Node | null = null;
  @property({ type: CurrencyManager, tooltip: '放在 GameRoot 上' }) currency: CurrencyManager | null = null;
  @property({ type: Collider, tooltip: '与玩家交互的触发器（默认取本节点）' }) trigger: Collider | null = null;

  /** 接受的物品大类（空=接受全部） */
  @property({ type: [Enum(ItemCategory)] }) acceptCategories: number[] = [];

  /** 只接受这些 id（可选；优先级高于分类） */
  @property({ type: [CCString] }) acceptIds: string[] = [];

  /** 交互键（默认 T 键出售） */
  @property({ type: Enum(KeyCode) }) tradeKey: KeyCode = KeyCode.KEY_T;

  @property
  showHint: boolean = true;

  private _inside = false;

  onLoad() {
    if (!this.trigger) this.trigger = this.getComponent(Collider);
    // 自动查找（尽量不强制）
    if (!this.itemDB) {
      const n = find('GameRoot');
      this.itemDB = n?.getComponent(ItemDatabase) ?? null;
    }
    if (!this.currency) {
      const n = find('GameRoot');
      this.currency = n?.getComponent(CurrencyManager) ?? null;
    }
  }

  onEnable() {
    if (this.trigger) {
      this.trigger.on('onTriggerEnter', this._onEnter, this);
      this.trigger.on('onTriggerExit',  this._onExit, this);
    }
    input.on(Input.EventType.KEY_DOWN, this._onKey, this);
  }
  onDisable() {
    if (this.trigger) {
      this.trigger.off('onTriggerEnter', this._onEnter, this);
      this.trigger.off('onTriggerExit',  this._onExit, this);
    }
    input.off(Input.EventType.KEY_DOWN, this._onKey, this);
  }

  private _onEnter(e: ITriggerEvent) {
    this._inside = true;
    if (this.showHint) {
      const name = this._keyName(this.tradeKey);
      InteractHint.instance()?.show(`按 ${name} 出售物品`);
    }
  }
  private _onExit(e: ITriggerEvent) {
    this._inside = false;
    if (this.showHint) InteractHint.instance()?.hide();
  }

  private _onKey(e: EventKeyboard) {
    if (!this._inside) return;
    if (e.keyCode !== this.tradeKey) return;
    this.sellAll();
  }

  /** 卖出玩家背包中所有“可出售”的物品 */
  public sellAll(): void {
    const bridge = this.player?.getComponent('PickupToInventory') as any;
    if (!bridge || !bridge.inventory) { console.warn('[NPCVendor] 找不到玩家背包'); return; }
    if (!this.itemDB || !this.currency) { console.warn('[NPCVendor] 缺少 itemDB 或 currency'); return; }

    const inv = bridge.inventory;
    const slots = inv.slots as any[];
    let soldCount = 0;
    let totalCoin = 0;
    const acceptSet = new Set(this.acceptIds.map(s => String(s).trim()).filter(Boolean));
    const limitCats = (this.acceptCategories ?? []) as number[];

    // 遍历所有格子，计算可售数量与价格
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (!s) continue;
      const d = this.itemDB.get(s.id);
      if (!d) continue;

      // 筛选：指定 id 或 分类
      if (acceptSet.size > 0 && !acceptSet.has(s.id)) continue;
      if (limitCats.length > 0) {
        // d.category 可能是 number（Enum）
        const cat = (d as any).category ?? -1;
        if (!limitCats.includes(cat)) continue;
      }

      const price = (d as any).sellPrice ?? 0;
      const canSell = (d as any).canSell ?? (price > 0); // 未显式设置时，只要价格>0就可售
      if (!canSell || price <= 0) continue;

      const cnt = s.count | 0;
      if (cnt <= 0) continue;

      totalCoin += price * cnt;
      soldCount += cnt;

      // 清空该格
      slots[i] = null;
    }

    if (soldCount <= 0) {
      InteractHint.instance()?.show('没有可出售的物品');
      return;
    }

    // 写回并广播背包刷新（让 UI 更新）
    inv.slots = slots;
    this.currency.addCoins(totalCoin);
    // 某些 UI 依赖自定义总线；此处仅打印提示
    InteractHint.instance()?.show(`出售 ${soldCount} 件物品，获得 ${totalCoin} 金币`);
    console.log('[NPCVendor] Sold items => +coins:', totalCoin, ' items:', soldCount);
  }

  private _keyName(k: KeyCode): string {
    const n = KeyCode[k] ?? '';
    return n.startsWith('KEY_') ? n.slice(4) : n;
  }
}
