import { _decorator, Component, Node, input, Input, KeyCode, EventKeyboard } from 'cc';
const { ccclass, property } = _decorator;

/** 按 I 键切换某个 UI 节点显隐（简易调试用） */
@ccclass('InventoryToggle')
export class InventoryToggle extends Component {
  @property(Node)
  target: Node | null = null;

  @property
  hotkey: number = KeyCode.KEY_I;

  onEnable() {
    input.on(Input.EventType.KEY_DOWN, this.onKey, this);
  }
  onDisable() {
    input.off(Input.EventType.KEY_DOWN, this.onKey, this);
  }
  onKey(e: EventKeyboard) {
    if (e.keyCode === this.hotkey && this.target) {
      this.target.active = !this.target.active;
    }
  }
}
