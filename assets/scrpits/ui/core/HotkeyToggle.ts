// assets/scrpits/ui/core/HotkeyToggle.ts
import { _decorator, Component, input, Input, EventKeyboard, KeyCode, Enum } from 'cc';
import { UIBus, UIEvents } from '../core/UIBus';
const { ccclass, property } = _decorator;

@ccclass('HotkeyToggle')
export class HotkeyToggle extends Component {
  // 注意：这里用 Enum(KeyCode)，并把类型写成 number（检查器才能正确显示枚举）
  @property({ type: Enum(KeyCode) })
  hotkey: number = KeyCode.KEY_I;

  onEnable() {
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }
  onDisable() {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }
  private onKeyDown(e: EventKeyboard) {
    if (e.keyCode === this.hotkey) {
      UIBus.emit(UIEvents.Toggle);
    }
  }
}
