/*  scrpits/farming/PlantingSystem.ts
 *  Cocos Creator 3.8.6
 *  - 提供 tryPlant(id) 在玩家前方落地点种下作物
 */
import {
    _decorator, Component, Node, Vec3, geometry, PhysicsSystem
} from 'cc';
import { PlantedCrop } from './PlantedCrop';
const { ccclass, property } = _decorator;

const RAY = new geometry.Ray();
const TMP = new Vec3();
const FWD = new Vec3(0, 0, -1);

@ccclass('PlantingSystem')
export class PlantingSystem extends Component {
    @property({ type: Node, tooltip: '玩家节点（挂有 PickupToInventory 的节点）' })
    invBridgeNode: Node | null = null;

    @property({ type: Node, tooltip: 'GameRoot（挂有 ItemDatabase）' })
    itemDBNode: Node | null = null;

    @property({ tooltip: '允许种植的物品 id 列表（逗号分隔）' })
    plantableList = 'apple'; // 例：apple,banana

    @property({ tooltip: '种植距离（从玩家前方多远落点）' })
    plantDistance = 1.2;

    /** 在玩家前方地面尝试种植指定 id；成功返回 true */
    public tryPlant(id: string): boolean {
        if (!id) return false;
        const okIds = this.plantableList.split(',').map(s => s.trim()).filter(Boolean);
        if (okIds.indexOf(id) === -1) return false;

        // 计算玩家前方一个点，向下打射线找地面
        const owner = this.node;
        owner.getWorldPosition(TMP);
        FWD.set(0, 0, -1);
        Vec3.transformQuat(FWD, FWD, owner.worldRotation);
        FWD.y = 0; FWD.normalize();

        // 起点：前方一点 + 稍微抬高
        const origin = new Vec3(
            TMP.x + FWD.x * this.plantDistance,
            TMP.y + 0.5,
            TMP.z + FWD.z * this.plantDistance
        );

        RAY.o.set(origin);
        RAY.d.set(0, -1, 0);

        let hitPos = new Vec3(origin.x, origin.y - 0.5, origin.z);
        const hit = PhysicsSystem.instance.raycastClosest(RAY, 0xffffffff, 2.0, true);
        // 兼容获取命中点（3.8 支持 raycastClosestResult.hitPoint）
        // 若拿不到，则退回到 origin 附近
        // @ts-ignore
        const res = (PhysicsSystem.instance as any).raycastClosestResult;
        if (hit && res && res.hitPoint) {
            hitPos = res.hitPoint.clone();
        }

        // 创建作物节点并配置
        const cropNode = new Node(`Crop_${id}`);
        cropNode.setWorldPosition(hitPos);
        cropNode.setRotationFromEuler(0, 0, 0);
        this.node.parent?.addChild(cropNode);

        const crop = cropNode.addComponent(PlantedCrop);
        crop.itemId = id;
        crop.itemDBNode = this.itemDBNode;

        return true;
    }
}
