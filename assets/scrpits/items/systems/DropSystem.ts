import { instantiate, Node, Vec3 } from 'cc';
import { ItemDatabase } from '../ItemDatabase';

export class DropSystem {
  constructor(private db: ItemDatabase, private worldRoot: Node) {}

  dropItem(id: string, position: Vec3, count = 1) {
    const data = this.db.get(id);
    if (!data || !data.worldModel) return;
    for (let i = 0; i < count; i++) {
      const go = instantiate(data.worldModel);
      go.setPosition(position);
      this.worldRoot.addChild(go);
    }
  }
}
