// scrpits/items/adapters/SelectedToHandSync.ts
import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
import { PickupToInventory } from './PickupToInventory';
import { ItemDatabase } from '../ItemDatabase';
const { ccclass, property } = _decorator;

@ccclass('SelectedToHandSync')
export class SelectedToHandSync extends Component {
    @property(Node) invHolder: Node | null = null;  // ��ң��� PickupToInventory��
    @property(Node) hand: Node | null = null;       // Hand_R
    @property(Node) dbNode: Node | null = null;     // GameRoot���� ItemDatabase��

    private _bridge: PickupToInventory | null = null;
    private _db: ItemDatabase | null = null;
    private _currentId = '';

    onLoad() {
        this._bridge = this.invHolder?.getComponent(PickupToInventory) || null;
        this._db = this.dbNode?.getComponent(ItemDatabase) || null;

        if (!this._bridge) console.warn('[HandSync] invHolder ��û�� PickupToInventory');
        if (!this._db) console.warn('[HandSync] dbNode ��û�� ItemDatabase');
        if (!this.hand) console.warn('[HandSync] hand δָ�������� Hand_R��');
    }

    onDisable() { this.clearHandAll(); }
    onDestroy() { this.clearHandAll(); }

    update() {
        const inv = this._bridge?.inventory;
        if (!inv) return;

        const sel = inv.getSelected();
        const id = sel?.id || '';

        if (id === this._currentId) return; // û�仯������

        this._currentId = id;
        this.clearHandAll();

        if (!id || !this.hand) return;

        const data: any = this._db?.get(id);
        if (!data) {
            console.warn('[HandSync] ItemData û�ҵ���', id);
            return;
        }

        // ���ݶ����ֶΣ�handPrefab > worldModel > worldPrefab > prefab
        const prefab: Prefab | null | undefined =
            data.handPrefab ?? data.worldModel ?? data.worldPrefab ?? data.prefab ?? null;

        if (!prefab) {
            console.warn('[HandSync] ��Ʒû�п��õ� Prefab��handPrefab/worldModel/worldPrefab/prefab ��Ϊ�գ���', id, data);
            return;
        }

        const go = instantiate(prefab);
        this.hand.addChild(go);
        // �����ֳ���̬΢������������λ��/�Ƕ�/����
        // go.setPosition(0, 0, 0);
        // go.setRotationFromEuler(0, 0, 0);
        // go.setScale(1, 1, 1);

        // ������־��������˵��ͬ���ɹ���
        // console.log('[HandSync] ��ʾ������Ʒ��', id, prefab.name);
    }

    /** ��� Hand_R �������ӽڵ㣨����˭�����ģ� */
    private clearHandAll() {
        if (!this.hand) return;
        const toRemove = [...this.hand.children];
        for (const c of toRemove) {
            c.removeFromParent();
            c.destroy();
        }
    }
}
