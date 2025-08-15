/*  scrpits/farming/PlantedCrop.ts
 *  Cocos Creator 3.8.6
 *  - 简易 3 阶段生长：缩放表现
 *  - 成熟后在原地生成 1 个对应物品（ItemPickup），自身销毁
 */
import {
    _decorator, Component, Node, Prefab, instantiate, Vec3, SpriteFrame
} from 'cc';
import { ItemPickup } from '../ItemPickup';
const { ccclass, property } = _decorator;

@ccclass('PlantedCrop')
export class PlantedCrop extends Component {
    @property({ tooltip: '种下的物品 id（例如 apple）' })
    itemId: string = '';

    @property({ type: Node, tooltip: 'GameRoot（挂 ItemDatabase）' })
    itemDBNode: Node | null = null;

    @property({ tooltip: '生长阶段 1/2/3 的持续秒数' })
    stage1Sec = 3;
    @property stage2Sec = 5;
    @property stage3Sec = 7;

    @property({ tooltip: '各阶段显示缩放（统一缩放）' })
    scaleStage1 = 0.4;
    @property scaleStage2 = 0.7;
    @property scaleStage3 = 1.0;

    @property({ tooltip: '成熟时产出数量' })
    yieldCount = 1;

    private _elapsed = 0;
    private _stage = 0; // 0->1->2->3
    private _model: Node | null = null;

    onLoad() {
        // 用对应物品的 worldModel 作为作物的“外观”
        const prefab = this._getWorldModelPrefab(this.itemId);
        if (prefab) {
            this._model = instantiate(prefab);
            this.node.addChild(this._model);
            this._applyScale(this.scaleStage1);
        }
    }

    update(dt: number) {
        this._elapsed += dt;

        if (this._stage === 0 && this._elapsed >= this.stage1Sec) {
            this._stage = 1; this._applyScale(this.scaleStage2);
        } else if (this._stage === 1 && this._elapsed >= this.stage1Sec + this.stage2Sec) {
            this._stage = 2; this._applyScale(this.scaleStage3);
        } else if (this._stage === 2 && this._elapsed >= this.stage1Sec + this.stage2Sec + this.stage3Sec) {
            this._spawnYield();
            this.node.destroy();
        }
    }

    private _applyScale(s: number) {
        if (this._model) this._model.setScale(s, s, s);
    }

    private _spawnYield() {
        const prefab = this._getWorldModelPrefab(this.itemId);
        if (!prefab) return;

        for (let i = 0; i < this.yieldCount; i++) {
            const n = instantiate(prefab);
            const p = n.getComponent(ItemPickup) || n.addComponent(ItemPickup);
            p.itemId = this.itemId;
            p.picked = false;

            this.node.parent?.addChild(n);
            // 稍微抬起一点，避免与地面穿插
            const pos = new Vec3();
            this.node.getWorldPosition(pos);
            pos.y += 0.1 + i * 0.02;
            n.setWorldPosition(pos);
            n.setRotationFromEuler(0, 0, 0);
        }
    }

    private _getWorldModelPrefab(id: string): Prefab | null {
        const db: any = this.itemDBNode?.getComponent('ItemDatabase');
        if (!db) return null;

        try {
            if (typeof db.get === 'function') {
                const data = db.get(id);
                return data && data.worldModel ? data.worldModel as Prefab : null;
            }
        } catch { /* ignore */ }

        // 兼容其他组织方式（按需补充）
        return null;
    }
}
