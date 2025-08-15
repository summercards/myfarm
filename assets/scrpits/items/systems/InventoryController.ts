// scripts/items/systems/InventoryController.ts
import {
    _decorator, Component, Node, Prefab, instantiate,
    input, Input, EventKeyboard, KeyCode, Vec3, Quat
} from 'cc';
import { PickupToInventory } from '../adapters/PickupToInventory';
import { ItemDatabase } from '../ItemDatabase';

const { ccclass, property } = _decorator;

@ccclass('InventoryController')
export class InventoryController extends Component {
    /* === 依赖 === */
    @property(Node) invHolder: Node | null = null;   // 玩家（含 PickupToInventory）
    @property(Node) dbNode: Node | null = null;      // GameRoot（含 ItemDatabase）
    @property(Node) hand: Node | null = null;        // Hand_R
    @property(Node) pickupRoot: Node | null = null;  // 扫描可拾取物体的根（建议拖 GameRoot）

    /* === 参数 === */
    @property dropDistance = 1.0;
    @property dropUpOffset = 0.2;
    @property pickupRadius = 2.0;
    @property useKeyE = true;
    @property useKeyQ = true;

    /* === 运行时 === */
    private _bridge: PickupToInventory | null = null;
    private _db: ItemDatabase | null = null;
    private _currentId = '';

    onLoad() {
        this._bridge = this.invHolder?.getComponent(PickupToInventory) || null;
        this._db = this.dbNode?.getComponent(ItemDatabase) || null;

        if (!this._bridge) console.warn('[InventoryController] invHolder 上没有 PickupToInventory');
        if (!this._db) console.warn('[InventoryController] dbNode 上没有 ItemDatabase');
        if (!this.hand) console.warn('[InventoryController] hand 未指定（请拖 Hand_R）');
        if (!this.pickupRoot) console.warn('[InventoryController] pickupRoot 未指定（建议拖 GameRoot）');
    }

    onEnable() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }
    onDisable() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        this.clearHandAll();
    }
    onDestroy() {
        this.clearHandAll();
    }

    private onKeyDown(e: EventKeyboard) {
        if (e.keyCode === KeyCode.KEY_Q && this.useKeyQ) {
            this.dropSelectedOne();
        } else if (e.keyCode === KeyCode.KEY_E && this.useKeyE) {
            this.pickupNearest();
        }
    }

    /* === 手上同步：把“当前选中项”显示到 Hand_R === */
    update() {
        if (!this._bridge?.inventory) return;
        const inv = this._bridge.inventory;
        const sel = inv.getSelected();
        const id = sel?.id || '';
        if (id === this._currentId) return;

        this._currentId = id;
        this.clearHandAll();

        if (!id || !this.hand) return;

        const data: any = this._db?.get(id);
        if (!data) { console.warn('[InventoryController] ItemData 没找到：', id); return; }

        // 手持优先级：handPrefab > worldModel > worldPrefab > prefab
        const prefab: Prefab | null | undefined =
            data.handPrefab ?? data.worldModel ?? data.worldPrefab ?? data.prefab ?? null;

        if (!prefab) {
            console.warn('[InventoryController] 物品没有可用手持Prefab(handPrefab/worldModel/worldPrefab/prefab)：', id);
            return;
        }

        const go = instantiate(prefab);
        this.hand.addChild(go);
        // 如需手持姿态调整，在此设置：
        // go.setPosition(0,0,0); go.setRotationFromEuler(0,0,0); go.setScale(1,1,1);
    }

    /* === Q：丢弃当前选中格的 1 个到前方，并从该格减 1 === */
    private dropSelectedOne() {
        if (!this._bridge?.inventory || !this._db) return;
        const inv = this._bridge.inventory;
        const idx = inv.selectedIndex;
        const stack = inv.getSelected();
        if (!stack) return;

        const id = stack.id;
        const data: any = this._db.get(id);
        // 地上显示优先：worldModel > worldPrefab > prefab
        const prefab: Prefab | null | undefined =
            data?.worldModel ?? data?.worldPrefab ?? data?.prefab ?? null;
        if (!prefab) { console.warn('[InventoryController] 丢弃失败：无 worldPrefab/prefab =>', id); return; }

        // 计算前方位置
        const baseFwd = new Vec3(0, 0, -1);
        const dir = new Vec3();
        Vec3.transformQuat(dir, baseFwd, this.node.worldRotation as Quat);
        dir.normalize();

        const p = this.node.worldPosition;
        const dropPos = new Vec3(p.x + dir.x * this.dropDistance,
            p.y + this.dropUpOffset,
            p.z + dir.z * this.dropDistance);

        // 实例化到场景
        const go = instantiate(prefab);
        (this.node.parent || this.node).addChild(go, true);
        go.setWorldPosition(dropPos);

        // 让它可再次拾取（用“字符串组件名”避免导入路径问题）
        try {
            let pickup = go.getComponent('ItemPickup') as any;
            if (!pickup) pickup = go.addComponent('ItemPickup') as any;
            pickup.itemId = id;
            pickup.count = 1;
        } catch (err) {
            console.warn('[InventoryController] 丢弃成功，但未能附加 ItemPickup：', err);
        }

        // 从选中格减 1（为空会触发自动修正选中）
        inv.removeAt(idx, 1);
    }

    /* === E：拾取最近的 ItemPickup（pickupRoot 下递归找） === */
    private pickupNearest() {
        if (!this._bridge?.inventory || !this.pickupRoot) return;

        const comps: any[] = [];
        this.collectItemPickups(this.pickupRoot, comps); // 递归找所有含 ItemPickup 的节点
        if (comps.length === 0) return;

        const myPos = this.node.worldPosition;
        let best: any = null;
        let bestD2 = Number.POSITIVE_INFINITY;
        const maxD2 = this.pickupRadius * this.pickupRadius;

        for (const it of comps) {
            const n: Node = it.node;
            if (!n.activeInHierarchy) continue;
            const d2 = Vec3.squaredDistance(myPos, n.worldPosition);
            if (d2 <= maxD2 && d2 < bestD2) { best = it; bestD2 = d2; }
        }
        if (!best) return;

        const id: string = best.itemId || best.id;
        const count: number = (best.count ?? 1);
        if (!id) { console.warn('[InventoryController] 找到 ItemPickup 但没有 itemId'); return; }

        const remain = this._bridge.inventory.addItem(id, count, true);
        if (remain === 0) {
            best.node.destroy();
        } else {
            console.warn(`[InventoryController] 背包装不下，剩余 ${remain} 未放入`);
        }
    }

    /** 递归搜集所有含 ItemPickup 的组件（用字符串组件名避免导入问题） */
    private collectItemPickups(node: Node, out: any[]) {
        const c = node.getComponent('ItemPickup') as any;
        if (c) out.push(c);
        for (const ch of node.children) this.collectItemPickups(ch, out);
    }

    private clearHandAll() {
        if (!this.hand) return;
        const arr = [...this.hand.children];
        for (const c of arr) { c.removeFromParent(); c.destroy(); }
    }
}
