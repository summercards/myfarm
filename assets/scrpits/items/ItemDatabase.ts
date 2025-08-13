import { _decorator, Component } from 'cc';
import { ItemData } from './ItemData';
const { ccclass, property } = _decorator;

@ccclass('ItemDatabase')
export class ItemDatabase extends Component {
  @property({ type: [ItemData] })
  allItems: ItemData[] = []; // 在检查器里把所有 ItemData 资产（Prefab）拖进来

  private _map: Map<string, ItemData> = new Map();

  onLoad() {
    this.rebuildIndex();
  }

  rebuildIndex() {
    this._map.clear();
    for (const d of this.allItems) {
      if (!d) continue;
      const id = d.id?.trim();
      if (!id) continue;
      if (this._map.has(id)) {
        console.warn(`[ItemDatabase] duplicated id: ${id}`);
      }
      this._map.set(id, d);
    }
  }

  get(id: string) {
    return this._map.get(id) || null;
  }
}
