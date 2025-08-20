/*  assets/scripts/farming/PlantPreviewCircle.ts
 *  在玩家前方的落点位置投射一个 2D 红色圆圈（UI 上绘制），仅当手持“可种植”物品时显示
 *  适配 Cocos Creator 3.8.6
 */
import {
    _decorator, Component, Node, Camera, UITransform, Graphics, Color,
    Vec3, geometry, PhysicsSystem, find, view
} from 'cc';
import { PlantingSystem } from './PlantingSystem';
import { ItemPickup } from '../ItemPickup';
const { ccclass, property } = _decorator;

const RAY = new geometry.Ray();
const TMP = new Vec3();
const FWD = new Vec3(0, 0, -1);

@ccclass('PlantPreviewCircle')
export class PlantPreviewCircle extends Component {
    /** 玩家用的相机（可不填，脚本会自动找 Main Camera） */
    @property({ type: Node }) camera: Node | null = null;
    /** UI 画布 Canvas（可不填，脚本会自动找 Canvas） */
    @property({ type: Node }) canvas: Node | null = null;
    /** 引用 PlantingSystem（用它的 plantDistance、itemDB、玩家节点） */
    @property({ type: PlantingSystem }) plantSys: PlantingSystem | null = null;

    /** 圈半径（像素）与线宽（像素） */
    @property radiusPx = 20;
    @property lineWidth = 4;

    private _uiNode: Node | null = null;
    private _gfx: Graphics | null = null;

    onLoad() {
        if (!this.camera) this.camera = find('Main Camera');
        if (!this.canvas) this.canvas = find('Canvas');

        // 创建一个 UI 节点到 Canvas 上，用 Graphics 画红圈
        if (this.canvas) {
            const n = new Node('PlantPreviewCircle');
            const ui = n.addComponent(UITransform);
            const size = (this.radiusPx + this.lineWidth) * 2;
            ui.setContentSize(size, size);

            const g = n.addComponent(Graphics);
            g.lineWidth = this.lineWidth;
            g.strokeColor = new Color(255, 0, 0, 255);
            g.clear(); g.circle(0, 0, this.radiusPx); g.stroke();

            // UI 坐标以屏幕中心为原点，所以画圆以 (0,0) 为中心
            this.canvas.addChild(n);
            this._uiNode = n;
            this._gfx = g;
            n.active = false;
        }
    }

    update() {
        if (!this.plantSys || !this.camera || !this._uiNode) return;

        // 1) 判断“手上是否拿着可种植的物品”
        const heldId = this._getHeldItemId();
        const canPlant = heldId ? this._isPlantable(heldId) : false;
        if (!canPlant) { this._uiNode.active = false; return; }

        // 2) 用与 PlantingSystem.tryPlant 相同的方式计算落点
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
        const hit = PhysicsSystem.instance.raycastClosest(RAY, 0xffffffff, 2.0, true);
        // @ts-ignore
        const res = (PhysicsSystem.instance as any).raycastClosestResult;
        if (hit && res && res.hitPoint) hitPos = res.hitPoint.clone();

        // 3) 把 3D 世界坐标投影到屏幕，再转换到 Canvas 的局部坐标
        const cam = this.camera.getComponent(Camera)!;
        const screen = cam.worldToScreen(hitPos);
        const sz = view.getCanvasSize();
        // Canvas 默认以屏幕中心为(0,0)；把屏幕左下为原点的坐标转换一下
        this._uiNode.setPosition(screen.x - sz.width / 2, screen.y - sz.height / 2, 0);

        // 4) 显示
        this._uiNode.active = true;
    }

    /** 读取当前手上物品 id（优先 hand 的激活子节点，其次 _held 兜底） */
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

    /** 根据 ItemDatabase 判断该 id 是否可种植 */
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
