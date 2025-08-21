/*  WorldNameTag.ts（Canvas 下的 Label 跟随 3D 目标显示名字）
 *  放在：assets/scripts/ui/WorldNameTag.ts
 *  用法：Canvas 下建一个 Label 节点，挂本脚本，拖拽 target=NPC 节点；
 *        若填写 npcCtrl，会自动用其 npcName 做文本。
 */
import {
    _decorator, Component, Node, Label, Camera, Vec3, UITransform, find,
} from 'cc';
import { NPCController } from '../npc/NPCController';
const { ccclass, property } = _decorator;

@ccclass('WorldNameTag')
export class WorldNameTag extends Component {
    /** 要跟随的 3D 目标（NPC 根节点） */
    @property({ type: Node }) target: Node | null = null;

    /** 用哪个相机进行投影（默认自动找 Main Camera） */
    @property({ type: Camera }) camera: Camera | null = null;

    /** 读取 NPC 名称（可选） */
    @property({ type: NPCController }) npcCtrl: NPCController | null = null;

    /** 文本组件（可留空，自动取本节点 Label） */
    @property({ type: Label }) label: Label | null = null;

    /** 头顶偏移高度（米） */
    @property offsetY: number = 1.8;

    /** 超出屏幕时是否隐藏 */
    @property hideWhenOffscreen: boolean = true;

    private _canvasUI: UITransform | null = null;
    private _worldPos = new Vec3();
    private _screenPos = new Vec3();
    private _uiPos = new Vec3();

    onLoad() {
        const canvas = find('Canvas');
        this._canvasUI = canvas?.getComponent(UITransform) ?? null;
        if (!this.label) this.label = this.getComponent(Label) ?? null;
        if (!this.camera) {
            const camNode = find('Main Camera');
            this.camera = camNode?.getComponent(Camera) ?? null;
        }
        if (this.npcCtrl && this.label) {
            this.label.string = this.npcCtrl.npcName || this.label.string;
        }
    }

    update() {
        if (!this.target || !this.camera || !this._canvasUI) return;

        // 取 NPC 头顶世界位置
        const tp = this.target.worldPosition;
        this._worldPos.set(tp.x, tp.y + this.offsetY, tp.z);

        // 世界->屏幕
        this.camera.worldToScreen(this._worldPos, this._screenPos);

        // 在屏幕后方时隐藏
        if (this.hideWhenOffscreen && this._screenPos.z <= 0) {
            this.node.active = false;
            return;
        }

        // 屏幕->UI（Canvas 局部）
        this._canvasUI.convertToNodeSpaceAR(this._screenPos, this._uiPos);
        this.node.setPosition(this._uiPos.x, this._uiPos.y);
        this.node.active = true;
    }
}
