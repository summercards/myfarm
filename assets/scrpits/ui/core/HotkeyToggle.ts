// assets/scripts/ui/HotkeyToggle.ts
import { _decorator, Component, Node, input, Input, EventKeyboard, KeyCode, Widget } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('HotkeyToggle')
export class HotkeyToggle extends Component {
    @property({ type: Node, tooltip: '要显隐的目标，留空则使用当前节点' })
    target: Node | null = null;

    @property({ tooltip: '触发键（默认 I）' })
    hotkey: KeyCode = KeyCode.KEY_I;

    @property({ tooltip: '显示时是否刷新一次 Widget 对齐' })
    alignOnShow: boolean = true;

    start() {
        if (!this.target) this.target = this.node;
    }
    onEnable() { input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this); }
    onDisable() { input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this); }

    private onKeyDown(e: EventKeyboard) {
        if (e.keyCode !== this.hotkey || !this.target) return;

        this.target.active = !this.target.active;

        // 打开时刷新一下 Widget 防止窗口尺寸变化后错位
        if (this.alignOnShow && this.target.active) {
            this.target.getComponent(Widget)?.updateAlignment();
        }
    }
}
