import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 将本脚本挂到任意节点（例如 GameRoot），运行时会往玩家的 PickupToInventory 里塞 1 个测试物品。
 * 用于验证 Inventory 与 UI 的连通性。如果 UI 能显示 +1，说明背包逻辑 OK。
 */
@ccclass('InventorySmokeTest')
export class InventorySmokeTest extends Component {
  @property(Node)
  player: Node | null = null;

  @property
  testItemId: string = 'apple';

  start() {
    const bridge = this.player?.getComponent('PickupToInventory') as any;
    if (bridge && typeof bridge.push === 'function') {
      const remain = bridge.push(this.testItemId, 1);
      console.log('[SmokeTest] pushed 1', this.testItemId, 'remain:', remain);
    } else {
      console.warn('[SmokeTest] No PickupToInventory on player node');
    }
  }
}
