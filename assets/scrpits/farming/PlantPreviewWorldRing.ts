/* assets/scripts/farming/PlantPreviewWorldRing.ts
 * 用世界空间的“面片 prefab”做种植预览圈（可被遮挡，贴地对齐法线）
 * Cocos Creator 3.8.6
 */
import {
    _decorator, Component, Node, Prefab, instantiate, Vec3, Quat,
    geometry, PhysicsSystem, find, Layers
} from 'cc';
import { PlantingSystem } from './PlantingSystem';
import { ItemPickup } from '../ItemPickup';
const { ccclass, property } = _decorator;

const RAY = new geometry.Ray();
const TMP = new Vec3();
const FWD = new Vec3(0, 0, -1);
const V_UP = new Vec3(0, 1, 0);
const V_TMP = new Vec3();

@ccclass('PlantPreviewWorldRing')
export class PlantPreviewWorldRing extends Component {
    /** 你的种植系统（用于读取玩家位置、itemDB、距离等） */
    @property({ type: PlantingSystem }) plantSys: PlantingSystem | null = null;

    /** 圆环面片的 Prefab（带 MeshRenderer+透明圆环贴图的平面，单位尺寸=1） */
    @property({ type: Prefab }) ringPrefab: Prefab | null = null;

    /** 圈直径（米）—— prefab 如果是 1×1 的单位平面，这里填直径即可 */
    @property ringDiameter = 0.6;

    /** 稍微抬离地面，避免 z-fighting（米） */
    @property lift = 0.01;

    /** 是否按照地面法线对齐（斜坡时更贴合；若只想总是“朝上”，关掉即可） */
    @property alignToGroundNormal = true;

    private _ring: Node | null = null;

    onLoad() {
        if (!this.plantSys) this.plantSys = find('GameRoot')?.getComponent(PlantingSystem) ?? null;
    }

    private _ensureRing() {
        if (this._ring || !this.ringPrefab) return;
        const n = instantiate(this.ringPrefab);
        n.layer = Layers.Enum.DEFAULT;
        (this.node.parent ?? this.node).addChild(n);
        n.active = false;
        this._ring = n;
    }

    update() {
        if (!this.plantSys) return;

        // 1) 手上是否拿着“可种植”的物品？
        const heldId = this._getHeldItemId();
        const canPlant = heldId ? this._isPlantable(heldId) : false;

        this._ensureRing();
        if (!this._ring) return;

        if (!canPlant) { this._ring.active = false; return; }

        // 2) 计算落点（与 PlantingSystem 相同）
        const owner = this.plantSys.invBridgeNode ?? this.plantSys.node;
        owner.getWorldPosition(TMP);
        FWD.set(0, 0, -1);
        Vec3.transformQuat(FWD, FWD, owner.worldRotation);
        FWD.y = 0; FWD.normalize();

        const origin = new Vec3(
            TMP.x + FWD.x * this.plantSys.plantDistance,
            TMP.y + 0.5,
            TMP.z + FWD.z * this.plantSys.plantDistance
        );
        RAY.o.set(origin);
        RAY.d.set(0, -1, 0);

        let hitPos = new Vec3(origin.x, origin.y - 0.5, origin.z);
        let hitNormal = V_UP;
        const hit = PhysicsSystem.instance.raycastClosest(RAY, 0xffffffff, 2.0, true);
        // @ts-ignore
        const res = (PhysicsSystem.instance as any).raycastClosestResult;
        if (hit && res) {
            if (res.hitPoint) hitPos = res.hitPoint.clone();
            if (res.hitNormal) hitNormal = res.hitNormal.clone().normalize();
        }

        // 3) 位置 + 微抬高
        hitPos.add3f(hitNormal.x * this.lift, hitNormal.y * this.lift, hitNormal.z * this.lift);
        this._ring.setWorldPosition(hitPos);

        // 4) 旋转（让面片法线对齐地面法线）
        if (this.alignToGroundNormal) {
            // 让“面片的 +Y”对齐地面法线：构造一个不过于接近法线的前向向量
            const up = hitNormal;
            // 取一个与 up 不共线的临时前向
            let view = V_TMP.set(1, 0, 0);
            if (Math.abs(Vec3.dot(view, up)) > 0.98) view.set(0, 0, 1);
            // 用 Quat.fromViewUp 构造旋转
            const q = new Quat();
            Quat.fromViewUp(q, view, up);
            this._ring.setWorldRotation(q);
        } else {
            this._ring.setRotationFromEuler(90, 0, 0); // 总是朝上（视你的 prefab 法线而定）
        }

        // 5) 缩放（单位平面 1×1 → 直径）
        const s = this.ringDiameter;
        this._ring.setScale(s, s, s);

        this._ring.active = true;
    }

    /** 读取手上物品 id（优先 hand 的激活子节点，其次 _held 兜底） */
    private _getHeldItemId(): string | null {
        const player: any = (this.plantSys?.invBridgeNode ?? this.plantSys?.node)?.getComponent('TPSCharacterController');
        if (player && player.hand) {
            for (const c of player.hand.children) {
                if (c.activeInHierarchy) {
                    const p = c.getComponent(ItemPickup);
                    if (p && typeof p.itemId === 'string') return p.itemId;
                }
            }
        }
        if (player && player['_held'] && typeof player['_held']['itemId'] === 'string') {
            return player['_held']['itemId'];
        }
        return null;
    }

    /** 查询 ItemDatabase：该 id 是否可种植 */
    private _isPlantable(id: string): boolean {
        const db: any = this.plantSys?.itemDBNode?.getComponent('ItemDatabase');
        if (!db) return false;
        let data: any = null;
        try { if (typeof db.get === 'function') data = db.get(id); } catch { }
        if (!data) {
            if (db?.byId && db.byId[id]) data = db.byId[id];
            else if (db?.map && db.map[id]) data = db.map[id];
        }
        return !!(data && data.plant && data.plant.plantable);
    }
}
