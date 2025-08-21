/*  scrpits/farming/PlantingSystem.ts
 *  Cocos Creator 3.8.6
 *  - Plant a crop prefab on the ground in front of the player.
 */
import { _decorator, Component, Node, Vec3, geometry, PhysicsSystem, Prefab } from 'cc';
import { PlantedCrop } from './PlantedCrop';
import { PlantingDef } from '../items/data/PlantingDefs';
import { PlantingValidator } from './PlantingValidator';
const { ccclass, property } = _decorator;

const RAY = new geometry.Ray();
const TMP = new Vec3();
const FWD = new Vec3(0, 0, -1);

@ccclass('PlantingSystem')
export class PlantingSystem extends Component {
    @property({ type: Node, tooltip: 'Player node (has TPSCharacterController / hand)' })
    invBridgeNode: Node | null = null;

    @property({ type: Node, tooltip: 'GameRoot (has ItemDatabase)' })
    itemDBNode: Node | null = null;

    @property({ type: Prefab, tooltip: 'Default tree prefab (used when ItemData.treePrefab is empty)' })
    defaultTreePrefab: Prefab | null = null;

    @property({ tooltip: 'Plantable item ids, comma separated (e.g., apple,banana)' })
    plantableList = 'apple,banana';

    @property({ tooltip: 'Plant distance (meters in front of player)' })
    plantDistance = 1.2;

    /** Read ItemData.plant to check plantable and fetch per-item config */
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

    /** Try plant by item id; return true on success */
    public tryPlant(id: string): boolean {
        if (!id) return false;

        // 1) Fetch per-item PlantingDef and check plantable
        const def = this._getPlantDef(id);
        if (!def) return false;

        // 2) Compute drop point in front of player, cast downward
        const owner = this.invBridgeNode ?? this.node;
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
        // ignore triggers
        const hit = PhysicsSystem.instance.raycastClosest(RAY, 0xffffffff, 2.0, false);
        // @ts-ignore
        const res = (PhysicsSystem.instance as any).raycastClosestResult;
        if (hit && res && res.hitPoint) hitPos = res.hitPoint.clone();

        // 2.5) Validate against PlantingSurface (slope/area/tags)
        const check = PlantingValidator.testAt(hitPos, 2.5, id);
        if (!check.ok) {
            console.log('[PlantingSystem] Not plantable:', check.reason || 'No plantable surface');
            return false;
        }

        // 3) Create crop container at validated position
        const cropNode = new Node(`Crop_${id}`);
        (this.node.parent ?? this.node).addChild(cropNode);
        cropNode.setWorldPosition(check.pos);
        cropNode.setRotationFromEuler(0, 0, 0);
        console.log('[PlantingSystem] Plant', id, 'at', check.pos);

        // 4) Find current visible node in hand as fallback drop template
        let handActive: Node | null = null;
        const playerCtrl: any = (this.invBridgeNode ?? this.node).getComponent('TPSCharacterController');
        if (playerCtrl && playerCtrl.hand) {
            for (const c of playerCtrl.hand.children) {
                if (c.activeInHierarchy) { handActive = c; break; }
            }
        }

        // 5) Initialize PlantedCrop with per-item config
        const crop = cropNode.addComponent(PlantedCrop);
        if (typeof def.growSeconds === 'number') crop.growSeconds = def.growSeconds;
        if (typeof def.startScale === 'number') crop.startScale = def.startScale;
        if (typeof def.targetScale === 'number') crop.targetScale = def.targetScale;
        if (typeof def.interactRadius === 'number') crop.interactRadius = def.interactRadius;
        if (typeof def.yieldCount === 'number') crop.yieldCount = def.yieldCount;

        crop.setup({
            treePrefab: def.treePrefab ?? this.defaultTreePrefab,
            itemId: id,
            itemDBNode: this.itemDBNode,
            fallbackDropTemplate: handActive
        });

        return true;
    }
}
