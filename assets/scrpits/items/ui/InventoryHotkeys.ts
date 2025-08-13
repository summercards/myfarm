import { _decorator, Component, Node, input, Input, EventKeyboard, KeyCode } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 控制某个节点的显隐（比如 InventoryDebugPanel 所在的 UI 节点），默认按 I 键切换。
 */
@ccclass('InventoryHotkeys')
export class InventoryHotkeys extends Component {
  @property(Node)
  toggleTarget: Node | null = null;

  @property
  toggleKey: KeyCode = KeyCode.KEY_I;

  onEnable() {
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }
  onDisable() {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }
  onKeyDown(e: EventKeyboard) {
    if (e.keyCode === this.toggleKey && this.toggleTarget) {
      this.toggleTarget.active = !this.toggleTarget.active;
    }
  }
}
