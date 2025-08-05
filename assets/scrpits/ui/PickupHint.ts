/* assets/scripts/ui/PickupHint.ts */
import { _decorator, Component, Label, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PickupHint')
export class PickupHint extends Component {
    @property(Label) label: Label | null = null;

    /** 显示并淡入文字 */
    show(msg: string) {
        if (!this.label) return;
        this.label.string = msg;
        this.node.active = true;
        this.node.opacity = 0;
        tween(this.node).to(0.2, { opacity: 255 }).start();
    }

    /** 隐藏并清空 */
    hide() {
        this.label!.string = '';
        this.node.active = false;
    }
}
