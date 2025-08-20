/*  scrpits/farming/PlantingSystem.ts
 *  Cocos Creator 3.8.6
 *  - 在玩家前方地面种下作物：立刻生成“树外观 prefab”，后续生长/采集由 PlantedCrop 处理
 */
import {
    _decorator, Component, Node, Vec3, geometry, PhysicsSystem, Prefab
} from 'cc';
import { PlantedCrop } from './PlantedCrop';
import { PlantingDef } from '../items/data/PlantingDefs';
const { ccclass, property } = _decorator;

const RAY = new geometry.Ray();
const TMP = new Vec3();
const FWD = new Vec3(0, 0, -1);

@ccclass('PlantingSystem')
export class PlantingSystem extends Component {
    @property({ type: Node, tooltip: '玩家节点（挂有 TPSCharacterController/hand 的节点）' })
    invBridgeNode: Node | null = null;

    @property({ type: Node, tooltip: 'GameRoot（挂有 ItemDatabase）' })
    itemDBNode: Node | null = null;

    @property({ type: Prefab, tooltip: '树外观 Prefab（种下后显示/成长的模型）' })
    defaultTreePrefab: Prefab | null = null;

    @property({ tooltip: '允许种植的物品 id 列表，逗号分隔（例：apple,banana）' })
    plantableList = 'apple,banana';

    @property({ tooltip: '种植距离（从玩家前方多远落点）' })
    plantDistance = 1.2;

    /** 从 ItemDatabase 读取种植配置，仅用于“是否可种”的检查（勾选了 plantable） */
    private _getPlantDef(id: string): PlantingDef | null {
        const db: any = this.itemDBNode?.getComponent('ItemDatabase');
        if (!db) return null;

        let data: any = null;
        try { if (typeof db.get === 'function') data = db.get(id); } catch { }

        if (!data) {
            if (db?.byId && db.byId[id]) data = db.byId[id];
            else if (db?.map && db.map[id]) data = db.map[id];
        }
        if (data && data.plant && data.plant.plantable) return data.plant as PlantingDef;
        return null;
    }

    /** 在玩家前方地面尝试种植指定 id；成功返回 true */
    public tryPlant(id: string): boolean {
        if (!id) return false;

        // 1) 校验：是否允许种
        const def = this._getPlantDef(id);
        if (!def) return false; // 未配置或未勾选 plantable → 不能种

        // 2) 计算玩家前方落点（向下射线）
        const owner = this.invBridgeNode ?? this.node;   // 用玩家节点计算前向
        owner.getWorldPosition(TMP);
        FWD.set(0, 0, -1);
        Vec3.transformQuat(FWD, FWD, owner.worldRotation);
        FWD.y = 0; FWD.normalize();

        const origin = new Vec3(
            TMP.x + FWD.x * this.plantDistance,
            TMP.y + 0.5,
            TMP.z + FWD.z * this.plantDistance
        );

        RAY.o.set(origin);
        RAY.d.set(0, -1, 0);

        let hitPos = new Vec3(origin.x, origin.y - 0.5, origin.z);
        const hit = PhysicsSystem.instance.raycastClosest(RAY, 0xffffffff, 2.0, true);
        // 3.8: raycastClosestResult.hitPoint 可用
        // @ts-ignore
        const res = (PhysicsSystem.instance as any).raycastClosestResult;
        if (hit && res && res.hitPoint) hitPos = res.hitPoint.clone();

        // 3) 创建作物容器
        const cropNode = new Node(`Crop_${id}`);
        (this.node.parent ?? this.node).addChild(cropNode);
        cropNode.setWorldPosition(hitPos);
        cropNode.setRotationFromEuler(0, 0, 0);
        console.log('[PlantingSystem] plant', id, 'at', hitPos);

        // 4) 取“手上当前可见”的节点，作为掉落模板的兜底
        let handActive: Node | null = null;
        const playerCtrl: any = (this.invBridgeNode ?? this.node).getComponent('TPSCharacterController');
        if (playerCtrl && playerCtrl.hand) {
            for (const c of playerCtrl.hand.children) {
                if (c.activeInHierarchy) { handActive = c; break; }
            }
        }

        // 5) 初始化 PlantedCrop：树外观 + 掉落水果 id +（可选）掉落模板 + DB 节点
        const crop = cropNode.addComponent(PlantedCrop);
        crop.setup({
            treePrefab: this.defaultTreePrefab,
            itemId: id,
            itemDBNode: this.itemDBNode,
            fallbackDropTemplate: handActive
        });

        return true;
    }
}
