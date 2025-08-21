/* assets/scripts/farming/PlantPreviewWorldRing.ts
 * World-space ring preview for planting, visible ONLY when plantable.
 * Cocos Creator 3.8.6
 */
import {
    _decorator, Component, Node, Prefab, instantiate, Vec3, Quat,
    geometry, PhysicsSystem, find, Layers
} from 'cc';
import { PlantingSystem } from './PlantingSystem';
import { PlantingValidator } from './PlantingValidator';
import { ItemPickup } from '../ItemPickup';
const { ccclass, property } = _decorator;

const RAY = new geometry.Ray();
const TMP = new Vec3();
const FWD = new Vec3(0, 0, -1);
const V_UP = new Vec3(0, 1, 0);
const V_TMP = new Vec3();
const Q_TMP = new Quat();

@ccclass('PlantPreviewWorldRing')
export class PlantPreviewWorldRing extends Component {
    /** Planting system holder (used to read player node, distance, DB, etc.) */
    @property({ type: PlantingSystem, displayName: 'Plant System' })
    plantSys: PlantingSystem | null = null;

    /** Ring prefab (a world-space plane with transparent ring texture, unit size = 1) */
    @property({ type: Prefab, displayName: 'Ring Prefab' })
    ringPrefab: Prefab | null = null;

    /** Ring diameter in meters (for a 1x1 unit plane) */
    @property({ displayName: 'Ring Diameter (m)' })
    ringDiameter = 0.6;

    /** Extra lift to avoid z-fighting (meters) */
    @property({ displayName: 'Lift (m)' })
    lift = 0.01;

    /** Align ring to ground normal (true = conform to slope; false = always face up) */
    @property({ displayName: 'Align To Ground Normal' })
    alignToGroundNormal = true;

    /** If true, ring is visible only when the spot is plantable */
    @property({ displayName: 'Only Show When Plantable' })
    onlyShowWhenPlantable = true;

    private _ring: Node | null = null;

    onLoad() {
        // Auto-find PlantingSystem if not set
        if (!this.plantSys) {
            this.plantSys = find('GameRoot')?.getComponent(PlantingSystem) ?? null;
        }
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

        // 1) Get held item id (used both to check "is plantable item" and as seedTag)
        const heldId = this._getHeldItemId();
        const canPlantItem = heldId ? this._isPlantable(heldId) : false;

        this._ensureRing();
        if (!this._ring) return;

        if (!canPlantItem) { this._ring.active = false; return; }

        // 2) Compute forward drop origin (same as PlantingSystem)
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

        // Ignore triggers
        let hitPos = new Vec3(origin.x, origin.y - 0.5, origin.z);
        let hitNormal = V_UP;
        const hit = PhysicsSystem.instance.raycastClosest(RAY, 0xffffffff, 2.0, false);
        // @ts-ignore
        const res = (PhysicsSystem.instance as any).raycastClosestResult;
        if (hit && res) {
            if (res.hitPoint) hitPos = res.hitPoint.clone();
            if (res.hitNormal) hitNormal = res.hitNormal.clone().normalize();
        }

        // 3) Final validation using PlantingValidator:
        //    - must hit a PlantingSurface
        //    - must pass slope/area/tag checks (seedTag = heldId)
        const check = PlantingValidator.testAt(hitPos, 2.5, heldId || undefined);

        // Show only when plantable if required
        const show = this.onlyShowWhenPlantable ? !!check.ok : true;
        this._ring.active = show;
        if (!show) return;

        // 4) Place ring at validated position + extra lift along normal
        const px = check.pos.x + check.normal.x * this.lift;
        const py = check.pos.y + check.normal.y * this.lift;
        const pz = check.pos.z + check.normal.z * this.lift;
        this._ring.setWorldPosition(px, py, pz);

        // 5) Rotation
        if (this.alignToGroundNormal) {
            PlantingValidator.alignUpToNormal(Q_TMP, check.normal);
            this._ring.setWorldRotation(Q_TMP);
        } else {
            // If your plane's normal is +Y, keep it facing up
            this._ring.setRotationFromEuler(90, 0, 0);
        }

        // 6) Scale (unit plane -> diameter)
        const s = this.ringDiameter;
        this._ring.setScale(s, s, s);
    }

    /** Read held item id: prefer active child under `hand`, fallback to _held */
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

    /** Query ItemDatabase: is this id plantable (ItemData.plant.plantable = true) */
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
