/* ItemHint3D.ts
 * --------------------------------------------------------
 * 通用 3D 物品拾取提示脚本   “挂 prefab 就能用”
 * ① 距离检测，近则激活 Hint，远则隐藏
 * ② 自动创建 Hint 子节点（Label3D + Billboard + Outline）
 * ③ 自动加载内置字体 builtin-font，省去手动设置
 *    —— 覆盖原脚本保存即可
 * -------------------------------------------------------- */

import {
    _decorator, Component, Node, Vec3, Label, Color, LabelOutline,
    Billboard, builtinResMgr
} from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ItemHint3D')
export class ItemHint3D extends Component {

    /* ---------- Inspector 参数 ---------- */

    @property({ type: Node, tooltip: '角色节点（留空自动查找名称 play）' })
    player: Node | null = null;

    @property({ tooltip: '显示距离 (米)' })
    radius = 1.2;

    @property({ tooltip: '按键名' })
    keyName = 'E';

    @property({ tooltip: '模板：{key}、{id} 占位符' })
    template = '{key}：拾取 {id}';

    @property({ tooltip: 'Y 方向偏移 (米)' })
    yOffset = 0.4;

    @property({ tooltip: '字体颜色' })
    color = new Color(255, 255, 200);

    /* ------------------------------------ */

    private _hint: Node | null = null;
    private _label: Label | null = null;

    onLoad() {
        /* 自动寻找 player */
        if (!this.player) {
            this.player = this.node.scene?.getChildByName('play') || null;
        }

        /* 获取或创建 Hint 子节点 */
        this._hint = this.node.getChildByName('Hint');
        if (!this._hint) {
            this._hint = new Node('Hint');
            this._hint.parent = this.node;
            this._hint.setPosition(0, this.yOffset, 0);

            /* ① Label3D */
            this._label = this._hint.addComponent(Label);
            // 自动指定内置字体（3.x 内置资源管理器）
            this._label.font = builtinResMgr.get('builtin-font');

            /* ② Billboard 让文字始终面向相机 */
            this._hint.addComponent(Billboard);

            /* ③ 黑色描边提高可读性 */
            const ol = this._hint.addComponent(LabelOutline);
            ol.color.set(0, 0, 0);
            ol.width = 1;
        } else {
            this._label = this._hint.getComponent(Label);
        }

        /* 初始化样式 */
        if (this._label) {
            this._label.color = this.color;
            this._label.string = '';        // 默认文本留空
        }
        this._hint!.active = false;       // 启动隐藏
    }

    update() {
        if (!this.player || !this._hint) return;

        const dis = Vec3.distance(this.player.worldPosition, this.node.worldPosition);
        const visible = dis <= this.radius;

        if (visible !== this._hint.active) {
            this._hint.active = visible;
            if (visible) this.refreshText();
        }
    }

    /** 按模板刷新文字 */
    private refreshText() {
        if (!this._label) return;

        const id = (this.getComponent('ItemPickup') as any)?.itemId ?? this.node.name;

        this._label.string = this.template
            .replace('{key}', this.keyName)
            .replace('{id}', id);
    }
}
