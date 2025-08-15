/*  scrpits/farming/PlantingSystem.ts
 *  Cocos Creator 3.8.6
 *  - �ṩ tryPlant(id) �����ǰ����ص���������
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
    @property({ type: Node, tooltip: '��ҽڵ㣨���� PickupToInventory �Ľڵ㣩' })
    invBridgeNode: Node | null = null;

    @property({ type: Node, tooltip: 'GameRoot������ ItemDatabase��' })
    itemDBNode: Node | null = null;

    @property({ tooltip: '������ֲ����Ʒ id �б����ŷָ���' })
    plantableList = 'apple'; // ����apple,banana

    @property({ tooltip: '��ֲ���루�����ǰ����Զ��㣩' })
    plantDistance = 1.2;

    /** �����ǰ�����波����ֲָ�� id���ɹ����� true */
    public tryPlant(id: string): boolean {
        if (!id) return false;
        const okIds = this.plantableList.split(',').map(s => s.trim()).filter(Boolean);
        if (okIds.indexOf(id) === -1) return false;

        // �������ǰ��һ���㣬���´������ҵ���
        const owner = this.node;
        owner.getWorldPosition(TMP);
        FWD.set(0, 0, -1);
        Vec3.transformQuat(FWD, FWD, owner.worldRotation);
        FWD.y = 0; FWD.normalize();

        // ��㣺ǰ��һ�� + ��΢̧��
        const origin = new Vec3(
            TMP.x + FWD.x * this.plantDistance,
            TMP.y + 0.5,
            TMP.z + FWD.z * this.plantDistance
        );

        RAY.o.set(origin);
        RAY.d.set(0, -1, 0);

        let hitPos = new Vec3(origin.x, origin.y - 0.5, origin.z);
        const hit = PhysicsSystem.instance.raycastClosest(RAY, 0xffffffff, 2.0, true);
        // ���ݻ�ȡ���е㣨3.8 ֧�� raycastClosestResult.hitPoint��
        // ���ò��������˻ص� origin ����
        // @ts-ignore
        const res = (PhysicsSystem.instance as any).raycastClosestResult;
        if (hit && res && res.hitPoint) {
            hitPos = res.hitPoint.clone();
        }

        // ��������ڵ㲢����
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
