/*  NPCController.ts（npcName 用 CCString）
 *  巡逻/朝向/对话暂停，适配 3.8.6
 */
import { _decorator, Component, Node, Vec3, Quat, math, CCString } from 'cc';
const { ccclass, property } = _decorator;

const V_UP = new Vec3(0,1,0);
const V_TMP = new Vec3();
const Q_TMP = new Quat();

@ccclass('NPCController')
export class NPCController extends Component {
    @property(CCString)
    public npcName: string = '村民';

    @property
    public moveSpeed: number = 1.8;

    @property
    public patrol: boolean = false;

    @property({ type: [Node] })
    public waypoints: Node[] = [];

    @property public waitMin = 0.5;
    @property public waitMax = 2.0;
    @property public arriveDistance = 0.1;

    private _curIndex = 0;
    private _waitTimer = 0;
    private _isWaiting = false;
    private _talking = false;

    public setTalking(t: boolean) { this._talking = t; }

    onEnable() {
        if (this.patrol && this.waypoints.length === 0) this.patrol = false;
    }

    update(dt: number) {
        if (this._talking || !this.patrol || this.waypoints.length === 0) return;

        if (this._isWaiting) {
            this._waitTimer -= dt;
            if (this._waitTimer <= 0) this._isWaiting = false;
            return;
        }

        const target = this.waypoints[this._curIndex];
        if (!target) return;

        const cur = this.node.worldPosition;
        const tar = target.worldPosition;
        Vec3.subtract(V_TMP, tar, cur);
        const dist = V_TMP.length();

        if (dist <= this.arriveDistance) {
            this._curIndex = (this._curIndex + 1) % this.waypoints.length;
            this._isWaiting = true;
            this._waitTimer = math.randomRange(this.waitMin, this.waitMax);
            return;
        }

        V_TMP.normalize();
        const step = this.moveSpeed * dt;
        this.node.setWorldPosition(cur.x + V_TMP.x * step, cur.y + V_TMP.y * step, cur.z + V_TMP.z * step);
        Quat.fromViewUp(Q_TMP, V_TMP, V_UP);
        this.node.setWorldRotation(Q_TMP);
    }
}
