import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

/** ����ɫ�����󽻸���ɫ�ű����� */
@ccclass('ItemPickup')
export class ItemPickup extends Component {

    @property({ displayName: '��Ʒ ID' })
    itemId = 'apple';              // ����������ͬ����

    picked = false;                // ����Ƿ��ѱ�ʰȡ
}
