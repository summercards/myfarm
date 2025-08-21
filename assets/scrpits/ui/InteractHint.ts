/*  InteractHint.ts
 *  功能：屏幕左下角/顶部显示“按 E 交互”的简易提示
 *  用法：Canvas 下放一个 Label 节点（命名 InteractHint），挂本脚本并拖引用。
 */
import { _decorator, Component, Node, Label, find } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('InteractHint')
export class InteractHint extends Component {
    /** 单例（Canvas/InteractHint） */
    public static instance(): InteractHint | null {
        const n = find('Canvas/InteractHint');
        return n?.getComponent(InteractHint) ?? null;
    }

    @property(Label) label: Label | null = null;

    onLoad() {
        this.hide();
    }

    public show(msg: string) {
        if (this.label) this.label.string = msg;
        this.node.active = true;
    }

    public hide() {
        if (this.label) this.label.string = '';
        this.node.active = false;
    }
}
