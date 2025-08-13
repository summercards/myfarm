import { _decorator, Component, instantiate, Node, Vec3 } from 'cc';
import { ItemDatabase } from '../ItemDatabase';
const { ccclass, property } = _decorator;

/**
 * 将 ItemDatabase 中的某个 id 的 worldModel 在本节点处实例化出来（运行时显示）。
 * 用法：把本脚本挂到一个空节点，设置 itemDB 与 itemId，运行游戏即可看到模型。
 */
@ccclass('ItemSpawner')
export class ItemSpawner extends Component {
  @property(ItemDatabase)
  itemDB: ItemDatabase | null = null;

  @property
  itemId: string = '';

  @property
  count: number = 1;

  start() {
    if (!this.itemDB || !this.itemId) return;
    const data = this.itemDB.get(this.itemId);
    if (!data || !data.worldModel) return;

    for (let i = 0; i < Math.max(1, this.count); i++) {
      const go = instantiate(data.worldModel);
      // 稍微错开一点，避免重叠
      go.setPosition(new Vec3(i * 0.5, 0, 0));
      this.node.addChild(go);
    }
  }
}
