// scrpits/items/adapters/SelectedToHandSync.ts
import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
import { PickupToInventory } from './PickupToInventory';
import { ItemDatabase } from '../ItemDatabase';
const { ccclass, property } = _decorator;

@ccclass('SelectedToHandSync')
export class SelectedToHandSync extends Component {
    @property(Node) invHolder: Node | null = null;  // 玩家（含 PickupToInventory）
    @property(Node) hand: Node | null = null;       // Hand_R
    @property(Node) dbNode: Node | null = null;     // GameRoot（含 ItemDatabase）

    private _bridge: PickupToInventory | null = null;
    private _db: ItemDatabase | null = null;
    private _currentId = '';

    onLoad() {
        this._bridge = this.invHolder?.getComponent(PickupToInventory) || null;
        this._db = this.dbNode?.getComponent(ItemDatabase) || null;

        if (!this._bridge) console.warn('[HandSync] invHolder 上没有 PickupToInventory');
        if (!this._db) console.warn('[HandSync] dbNode 上没有 ItemDatabase');
        if (!this.hand) console.warn('[HandSync] hand 未指定（请拖 Hand_R）');
    }

    onDisable() { this.clearHandAll(); }
    onDestroy() { this.clearHandAll(); }

    update() {
        const inv = this._bridge?.inventory;
        if (!inv) return;

        const sel = inv.getSelected();
        const id = sel?.id || '';

        if (id === this._currentId) return; // 没变化不处理

        this._currentId = id;
        this.clearHandAll();

        if (!id || !this.hand) return;

        const data: any = this._db?.get(id);
        if (!data) {
            console.warn('[HandSync] ItemData 没找到：', id);
            return;
        }

        // 兼容多种字段：handPrefab > worldModel > worldPrefab > prefab
        const prefab: Prefab | null | undefined =
            data.handPrefab ?? data.worldModel ?? data.worldPrefab ?? data.prefab ?? null;

        if (!prefab) {
            console.warn('[HandSync] 物品没有可用的 Prefab（handPrefab/worldModel/worldPrefab/prefab 都为空）：', id, data);
            return;
        }

        const go = instantiate(prefab);
        this.hand.addChild(go);
        // 如需手持姿态微调，这里设置位置/角度/缩放
        // go.setPosition(0, 0, 0);
        // go.setRotationFromEuler(0, 0, 0);
        // go.setScale(1, 1, 1);

        // 调试日志（看到就说明同步成功）
        // console.log('[HandSync] 显示手上物品：', id, prefab.name);
    }

    /** 清空 Hand_R 下所有子节点（无论谁创建的） */
    private clearHandAll() {
        if (!this.hand) return;
        const toRemove = [...this.hand.children];
        for (const c of toRemove) {
            c.removeFromParent();
            c.destroy();
        }
    }
}
