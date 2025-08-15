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
    /* === ���� === */
    @property(Node) invHolder: Node | null = null;   // ��ң��� PickupToInventory��
    @property(Node) dbNode: Node | null = null;      // GameRoot���� ItemDatabase��
    @property(Node) hand: Node | null = null;        // Hand_R
    @property(Node) pickupRoot: Node | null = null;  // ɨ���ʰȡ����ĸ��������� GameRoot��

    /* === ���� === */
    @property dropDistance = 1.0;
    @property dropUpOffset = 0.2;
    @property pickupRadius = 2.0;
    @property useKeyE = true;
    @property useKeyQ = true;

    /* === ����ʱ === */
    private _bridge: PickupToInventory | null = null;
    private _db: ItemDatabase | null = null;
    private _currentId = '';

    onLoad() {
        this._bridge = this.invHolder?.getComponent(PickupToInventory) || null;
        this._db = this.dbNode?.getComponent(ItemDatabase) || null;

        if (!this._bridge) console.warn('[InventoryController] invHolder ��û�� PickupToInventory');
        if (!this._db) console.warn('[InventoryController] dbNode ��û�� ItemDatabase');
        if (!this.hand) console.warn('[InventoryController] hand δָ�������� Hand_R��');
        if (!this.pickupRoot) console.warn('[InventoryController] pickupRoot δָ���������� GameRoot��');
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

    /* === ����ͬ�����ѡ���ǰѡ�����ʾ�� Hand_R === */
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
        if (!data) { console.warn('[InventoryController] ItemData û�ҵ���', id); return; }

        // �ֳ����ȼ���handPrefab > worldModel > worldPrefab > prefab
        const prefab: Prefab | null | undefined =
            data.handPrefab ?? data.worldModel ?? data.worldPrefab ?? data.prefab ?? null;

        if (!prefab) {
            console.warn('[InventoryController] ��Ʒû�п����ֳ�Prefab(handPrefab/worldModel/worldPrefab/prefab)��', id);
            return;
        }

        const go = instantiate(prefab);
        this.hand.addChild(go);
        // �����ֳ���̬�������ڴ����ã�
        // go.setPosition(0,0,0); go.setRotationFromEuler(0,0,0); go.setScale(1,1,1);
    }

    /* === Q��������ǰѡ�и�� 1 ����ǰ�������Ӹø�� 1 === */
    private dropSelectedOne() {
        if (!this._bridge?.inventory || !this._db) return;
        const inv = this._bridge.inventory;
        const idx = inv.selectedIndex;
        const stack = inv.getSelected();
        if (!stack) return;

        const id = stack.id;
        const data: any = this._db.get(id);
        // ������ʾ���ȣ�worldModel > worldPrefab > prefab
        const prefab: Prefab | null | undefined =
            data?.worldModel ?? data?.worldPrefab ?? data?.prefab ?? null;
        if (!prefab) { console.warn('[InventoryController] ����ʧ�ܣ��� worldPrefab/prefab =>', id); return; }

        // ����ǰ��λ��
        const baseFwd = new Vec3(0, 0, -1);
        const dir = new Vec3();
        Vec3.transformQuat(dir, baseFwd, this.node.worldRotation as Quat);
        dir.normalize();

        const p = this.node.worldPosition;
        const dropPos = new Vec3(p.x + dir.x * this.dropDistance,
            p.y + this.dropUpOffset,
            p.z + dir.z * this.dropDistance);

        // ʵ����������
        const go = instantiate(prefab);
        (this.node.parent || this.node).addChild(go, true);
        go.setWorldPosition(dropPos);

        // �������ٴ�ʰȡ���á��ַ�������������⵼��·�����⣩
        try {
            let pickup = go.getComponent('ItemPickup') as any;
            if (!pickup) pickup = go.addComponent('ItemPickup') as any;
            pickup.itemId = id;
            pickup.count = 1;
        } catch (err) {
            console.warn('[InventoryController] �����ɹ�����δ�ܸ��� ItemPickup��', err);
        }

        // ��ѡ�и�� 1��Ϊ�ջᴥ���Զ�����ѡ�У�
        inv.removeAt(idx, 1);
    }

    /* === E��ʰȡ����� ItemPickup��pickupRoot �µݹ��ң� === */
    private pickupNearest() {
        if (!this._bridge?.inventory || !this.pickupRoot) return;

        const comps: any[] = [];
        this.collectItemPickups(this.pickupRoot, comps); // �ݹ������к� ItemPickup �Ľڵ�
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
        if (!id) { console.warn('[InventoryController] �ҵ� ItemPickup ��û�� itemId'); return; }

        const remain = this._bridge.inventory.addItem(id, count, true);
        if (remain === 0) {
            best.node.destroy();
        } else {
            console.warn(`[InventoryController] ����װ���£�ʣ�� ${remain} δ����`);
        }
    }

    /** �ݹ��Ѽ����к� ItemPickup ����������ַ�����������⵼�����⣩ */
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
