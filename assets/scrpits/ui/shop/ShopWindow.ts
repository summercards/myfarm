/* assets/scrpits/ui/shop/ShopWindow.ts
 * 商店窗口（左=NPC在售，右=玩家背包）
 * - 优先采用预制体里的节点（按固定命名），否则回落到代码构建默认 UI
 * - 单例：可在场景中预放一个预制体，或不放时自动创建
 * - 打开时隐藏外层背包面板；关闭时恢复
 * - 整树重定向：把所有子组件的桥接/缓存都切到目标桥，然后 refresh
 */
import {
  _decorator, Component, Node, UITransform, Widget, Graphics, Color,
  Label, Vec3, find, Layers, Size, instantiate
} from 'cc';
import { ShopContext } from '../../npc/ShopContext';
const { ccclass } = _decorator;

@ccclass('ShopWindow')
export class ShopWindow extends Component {
  private static _inst: ShopWindow | null = null;

  /** 获取/创建单例：优先复用场景里已有的 ShopWindow 组件 */
  static instance(): ShopWindow {
    if (this._inst && this._inst.node.isValid) return this._inst;
    // 场景里是否已经放了预制体？
    const exist = find('Canvas')?.getComponentInChildren(ShopWindow, true);
    if (exist) {
      this._inst = exist;
      this._inst._initFromPrefabOrBuild();
      return this._inst;
    }
    // 没有就创建一个
    const canvas = find('Canvas');
    const n = new Node('ShopWindow');
    canvas?.addChild(n);
    this._inst = n.addComponent(ShopWindow);
    this._inst._initFromPrefabOrBuild();
    return this._inst;
  }

  /** 外部调用：为某 NPC 打开商店 */
  static openForNPC(npcNode: Node, itemDBNode?: Node | null, playerNode?: Node | null) {
    const inst = this.instance();
    inst._open(npcNode, itemDBNode || find('GameRoot'), playerNode || find('play'));
  }
  /** 外部调用：如果开着就关闭 */
  static closeIfOpen() {
    const inst = this._inst;
    if (inst && inst.node.isValid && inst.node.active) inst._onClose();
  }

  // 引用 / UI
  private _itemDBNode: Node | null = null;
  private _playerNode: Node | null = null;
  private _npcNode: Node | null = null;

  private _bg!: Node;
  private _left!: Node;
  private _right!: Node;
  private _coinLb!: Label;
  private _maskG!: Graphics;
  private _maskSize = new Size(0, 0);

  // 桥接与货币
  private _goodsBridgeNode!: Node;
  private _goodsBridge: any = null;
  private _playerBridge: any = null;
  private _currency: any = null;

  // 两个克隆的面板
  private _leftInvNode: Node | null = null;
  private _rightInvNode: Node | null = null;

  // 外层背包模板及开关还原
  private _templateInvNode: Node | null = null;
  private _templatePrevActive = true;

  /* ---------------- 生命周期 ---------------- */
  onLoad() {
    if (!ShopWindow._inst) ShopWindow._inst = this;
    this._initFromPrefabOrBuild();
  }

  private _initFromPrefabOrBuild() {
    // 优先尝试“采用预制体里的节点”
    const bg = this.node.getChildByName('Bg');
    const left = bg?.getChildByName('NpcGoodsPanel');
    const right = bg?.getChildByName('PlayerInvPanel');
    const coins = bg?.getChildByName('Coins');
    const mask = bg?.getChildByName('Mask');
    const close = bg?.getChildByName('Close');
    const title = bg?.getChildByName('Title');

    if (bg && left && right && coins && mask && close && title) {
      this._bg = bg;
      this._left = left;
      this._right = right;
      this._coinLb = coins.getComponent(Label) ?? coins.addComponent(Label);
      // 遮罩可用 Graphics 或 Sprite，这里优先 Graphics
      this._maskG = mask.getComponent(Graphics) ?? mask.addComponent(Graphics);
      // 关闭按钮
      close.off(Node.EventType.TOUCH_END);
      close.on(Node.EventType.TOUCH_END, () => this._onClose());
      this._ensureUILayerDeep(this.node);
      this.node.active = false;
      return; // 预制体模式就绪
    }

    // 否则用代码构建默认 UI（与之前版本一致）
    this._buildCodeUI();
  }

  /* ---------------- 默认代码 UI（无预制体时使用） ---------------- */
  private _buildCodeUI() {
    this.node.layer = Layers.Enum.UI_2D;
    this.node.addComponent(UITransform);
    const w = this.node.addComponent(Widget);
    w.isAlignLeft = w.isAlignRight = w.isAlignTop = w.isAlignBottom = true;
    w.left = w.right = w.top = w.bottom = 0;

    this._bg = new Node('Bg'); this.node.addChild(this._bg);
    this._bg.addComponent(UITransform);
    const wg = this._bg.addComponent(Widget);
    wg.isAlignLeft = wg.isAlignRight = wg.isAlignTop = wg.isAlignBottom = true;
    wg.left = wg.right = wg.top = wg.bottom = 0;

    const mask = new Node('Mask'); this._bg.addChild(mask);
    mask.addComponent(UITransform);
    this._maskG = mask.addComponent(Graphics);

    const title = new Node('Title'); this._bg.addChild(title);
    title.addComponent(UITransform).setContentSize(400, 40);
    title.setPosition(new Vec3(0, 300));
    const tLb = title.addComponent(Label); tLb.string = '商店'; tLb.fontSize = 26; tLb.lineHeight = 30;

    const coin = new Node('Coins'); this._bg.addChild(coin);
    this._coinLb = coin.addComponent(Label); this._coinLb.string = '金币：0'; this._coinLb.fontSize = 22; this._coinLb.lineHeight = 26;
    coin.setPosition(new Vec3(460, 300));

    this._left = new Node('NpcGoodsPanel'); this._bg.addChild(this._left);
    this._left.addComponent(UITransform).setContentSize(520, 520);
    const lw = this._left.addComponent(Widget); lw.isAlignLeft = true; lw.left = 40; lw.isAlignTop = true; lw.top = 70;

    this._right = new Node('PlayerInvPanel'); this._bg.addChild(this._right);
    this._right.addComponent(UITransform).setContentSize(520, 520);
    const rw = this._right.addComponent(Widget); rw.isAlignRight = true; rw.right = 40; rw.isAlignTop = true; rw.top = 70;

    const close = new Node('Close'); this._bg.addChild(close);
    close.addComponent(UITransform).setContentSize(120, 40);
    const cLb = close.addComponent(Label); cLb.string = '关闭'; cLb.fontSize = 24; cLb.lineHeight = 28;
    close.setPosition(new Vec3(0, -300));
    close.on(Node.EventType.TOUCH_END, () => this._onClose());

    this._ensureUILayerDeep(this.node);
    this.node.active = false;
  }

  private _ensureUILayerDeep(n: Node) {
    n.layer = Layers.Enum.UI_2D;
    for (const c of n.children) this._ensureUILayerDeep(c);
  }
  private _redrawMaskIfNeeded() {
    const ui = this._bg.getComponent(UITransform)!;
    const w = ui.width, h = ui.height;
    if (w === this._maskSize.width && h === this._maskSize.height) return;
    this._maskSize.set(w, h);
    const g = this._maskG;
    g.clear();
    g.fillColor = new Color(0, 0, 0, 140);
    g.rect(-w / 2, -h / 2, w, h); g.fill();
  }

  /* ---------------- 工具：整树重定向 ---------------- */
  private _retargetTree(root: Node, dbNode: Node | null, bridgeNode: Node | null) {
    const bridge = bridgeNode ? bridgeNode.getComponent('PickupToInventory') : null;
    const db     = dbNode     ? dbNode.getComponent('ItemDatabase')          : null;
    const queue: Node[] = [root];
    while (queue.length) {
      const n = queue.shift()!;
      for (const comp of n.components as any[]) this._retargetComp(comp, db, bridge);
      for (const ch of n.children) queue.push(ch);
    }
  }
  private _retargetComp(comp: any, db: any, bridge: any) {
    if ('itemDBNode'    in comp) comp.itemDBNode    = db?.node ?? null;
    if ('invBridgeNode' in comp) comp.invBridgeNode = bridge?.node ?? null;
    if ('_db'       in comp) comp._db       = db ?? null;
    if ('db'        in comp) comp.db        = db ?? null;
    if ('_bridge'   in comp) comp._bridge   = bridge ?? null;
    if ('bridge'    in comp) comp.bridge    = bridge ?? null;
    if ('_inv'      in comp) comp._inv      = bridge?.inventory ?? null;
    if ('inv'       in comp) comp.inv       = bridge?.inventory ?? null;
    if ('inventory' in comp) comp.inventory = bridge?.inventory ?? null;
    if ('dataSource' in comp) comp.dataSource = bridge?.inventory ?? null;
    if ('sourceInv'  in comp) comp.sourceInv  = bridge?.inventory ?? null;
    if (typeof comp.setBridge    === 'function') comp.setBridge(bridge);
    if (typeof comp.setInventory === 'function') comp.setInventory(bridge?.inventory);
    if (typeof comp.bind         === 'function') comp.bind({ db, bridge });
    if (typeof comp.refresh      === 'function') comp.refresh();
  }

  private _collectCells(root: Node): Node[] {
    const out: Node[] = [];
    const walk = (n: Node) => { if (n.name.startsWith('Cell_')) out.push(n); for (const c of n.children) walk(c); };
    walk(root); return out;
  }
  private _bindCells(root: Node, isLeft: boolean) {
    const cells = this._collectCells(root);
    for (const n of cells) {
      n.off(Node.EventType.TOUCH_END);
      n.on(Node.EventType.TOUCH_END, () => {
        const idx = parseInt(n.name.replace('Cell_', '')) || 0;
        isLeft ? this._buy(idx) : this._sell(idx);
      });
    }
  }

  /* ---------------- 打开 ---------------- */
  private _open(npcNode: Node | null, itemDBNode: Node | null, playerNode: Node | null) {
    if (!npcNode || !itemDBNode || !playerNode) { console.warn('[ShopWindow] 缺少引用'); return; }
    this._npcNode = npcNode; this._itemDBNode = itemDBNode; this._playerNode = playerNode;
    ShopContext.shopOpen = true;

    this._currency     = find('GameRoot')?.getComponent('CurrencyManager') as any;
    this._playerBridge = this._playerNode.getComponent('PickupToInventory');

    // 临时 NPC 背包
    if (!this._goodsBridgeNode || !this._goodsBridgeNode.isValid) {
      this._goodsBridgeNode = new Node('NpcGoodsBridge');
      this.node.addChild(this._goodsBridgeNode);
      (this._goodsBridgeNode as any).addComponent('PickupToInventory');
    }
    this._goodsBridge = this._goodsBridgeNode.getComponent('PickupToInventory');
    this._goodsBridge.itemDB = this._itemDBNode.getComponent('ItemDatabase');
    this._goodsBridge.onLoad?.();

    // 清空并填 NPCShop 货物
    const inv = this._goodsBridge.inventory;
    if (!inv) { console.warn('[ShopWindow] goods bridge 无 inventory'); return; }
    for (let i = 0; i < inv.slots.length; i++) inv.slots[i] = null;
    const cfg = this._npcNode.getComponent('NPCShop') as any;
    if (!cfg) { console.warn('[ShopWindow] 该 NPC 没有 NPCShop 配置'); return; }
    let fill = 0;
    for (const g of (cfg.goods as any[]) ?? []) {
      if (!g || !g.id) continue;
      const count = g.stock < 0 ? 99 : Math.max(0, g.stock);
      if (count <= 0) continue;
      if (fill < inv.slots.length) inv.slots[fill++] = { id: g.id, count };
    }

    // 模板=外层背包（克隆两份），并隐藏外层背包防叠加
    const template = find('Canvas/InventoryPanel');
    if (!template) { console.warn('[ShopWindow] 没找到 Canvas/InventoryPanel 模板'); return; }
    this._templateInvNode = template;
    this._templatePrevActive = template.active;
    template.active = false;

    // 左（NPC在售）
    if (this._leftInvNode && this._leftInvNode.isValid) this._leftInvNode.destroy();
    this._leftInvNode = instantiate(template);
    this._left.addChild(this._leftInvNode);
    this._leftInvNode.setPosition(new Vec3(0, 0, 0));
    this._leftInvNode.active = true;
    this._ensureUILayerDeep(this._leftInvNode);
    this._retargetTree(this._leftInvNode, this._itemDBNode, this._goodsBridgeNode);

    // 右（玩家背包）
    if (this._rightInvNode && this._rightInvNode.isValid) this._rightInvNode.destroy();
    this._rightInvNode = instantiate(template);
    this._right.addChild(this._rightInvNode);
    this._rightInvNode.setPosition(new Vec3(0, 0, 0));
    this._rightInvNode.active = true;
    this._ensureUILayerDeep(this._rightInvNode);
    this._retargetTree(this._rightInvNode, this._itemDBNode, this._playerNode);

    // 绑定点击
    this.scheduleOnce(() => {
      if (this._leftInvNode)  this._bindCells(this._leftInvNode, true);
      if (this._rightInvNode) this._bindCells(this._rightInvNode, false);
    }, 0);

    if (this.node.parent) this.node.setSiblingIndex(this.node.parent.children.length - 1);
    this._redrawMaskIfNeeded();
    this._refreshCoins();
    this.node.active = true;
  }

  private _refreshCoins() {
    const c = (this._currency as any)?.coins ?? 0;
    this._coinLb.string = `金币：${c | 0}`;
  }

  /* ---------------- 买/卖 ---------------- */
  private _buy(idx: number) {
    const cfg = this._npcNode?.getComponent('NPCShop') as any;
    if (!cfg || !this._goodsBridge || !this._playerBridge) return;
    const inv = this._goodsBridge.inventory;
    const s = inv?.slots[idx]; if (!s) return;

    const id = s.id;
    const g = (cfg.goods as any[]).find((x: any) => x.id === id);
    const price = g?.buyPrice ?? 0;

    if (this._currency?.trySpend && !this._currency.trySpend(price)) {
      console.log('[Shop] 金币不足'); return;
    }
    this._playerBridge.push(id, 1);

    if ((g?.stock ?? -1) >= 0) {
      s.count -= 1; g.stock -= 1;
      if (s.count <= 0) inv.slots[idx] = null;
    }
    this._refreshAll();
  }

  private _sell(idx: number) {
    const db = this._itemDBNode?.getComponent('ItemDatabase') as any;
    const pb = this._playerBridge; if (!db || !pb) return;

    const inv = pb.inventory;
    const s = inv?.slots[idx]; if (!s) return;

    const data = typeof db.get === 'function' ? db.get(s.id) : null;
    const price = data?.sellPrice ?? 0;
    const canSell = (data?.canSell ?? (price > 0)) && price > 0;
    if (!canSell) { console.log('[Shop] 该物品不可出售'); return; }

    s.count -= 1;
    if (s.count <= 0) inv.slots[idx] = null;

    if (this._currency?.addCoins) this._currency.addCoins(price);
    else if (this._currency) this._currency.coins = ((this._currency.coins | 0) + price);

    this._refreshAll();
  }

  private _refreshAll() {
    if (this._leftInvNode) {
      this._retargetTree(this._leftInvNode, this._itemDBNode, this._goodsBridgeNode);
      this._bindCells(this._leftInvNode, true);
    }
    if (this._rightInvNode) {
      this._retargetTree(this._rightInvNode, this._itemDBNode, this._playerNode);
      this._bindCells(this._rightInvNode, false);
    }
    this._redrawMaskIfNeeded();
    this._refreshCoins();
  }

  /* ---------------- 关闭 ---------------- */
  private _onClose() {
    this.node.active = false;
    ShopContext.shopOpen = false;
    if (this._leftInvNode  && this._leftInvNode.isValid)  { this._leftInvNode.destroy();  this._leftInvNode = null; }
    if (this._rightInvNode && this._rightInvNode.isValid) { this._rightInvNode.destroy(); this._rightInvNode = null; }
    if (this._templateInvNode && this._templateInvNode.isValid) {
      this._templateInvNode.active = this._templatePrevActive;
    }
  }
}
