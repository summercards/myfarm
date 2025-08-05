/* ItemHint3D.ts
 * --------------------------------------------------------
 * ͨ�� 3D ��Ʒʰȡ��ʾ�ű�   ���� prefab �����á�
 * �� �����⣬���򼤻� Hint��Զ������
 * �� �Զ����� Hint �ӽڵ㣨Label3D + Billboard + Outline��
 * �� �Զ������������� builtin-font��ʡȥ�ֶ�����
 *    ���� ����ԭ�ű����漴��
 * -------------------------------------------------------- */

import {
    _decorator, Component, Node, Vec3, Label, Color, LabelOutline,
    Billboard, builtinResMgr
} from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ItemHint3D')
export class ItemHint3D extends Component {

    /* ---------- Inspector ���� ---------- */

    @property({ type: Node, tooltip: '��ɫ�ڵ㣨�����Զ��������� play��' })
    player: Node | null = null;

    @property({ tooltip: '��ʾ���� (��)' })
    radius = 1.2;

    @property({ tooltip: '������' })
    keyName = 'E';

    @property({ tooltip: 'ģ�壺{key}��{id} ռλ��' })
    template = '{key}��ʰȡ {id}';

    @property({ tooltip: 'Y ����ƫ�� (��)' })
    yOffset = 0.4;

    @property({ tooltip: '������ɫ' })
    color = new Color(255, 255, 200);

    /* ------------------------------------ */

    private _hint: Node | null = null;
    private _label: Label | null = null;

    onLoad() {
        /* �Զ�Ѱ�� player */
        if (!this.player) {
            this.player = this.node.scene?.getChildByName('play') || null;
        }

        /* ��ȡ�򴴽� Hint �ӽڵ� */
        this._hint = this.node.getChildByName('Hint');
        if (!this._hint) {
            this._hint = new Node('Hint');
            this._hint.parent = this.node;
            this._hint.setPosition(0, this.yOffset, 0);

            /* �� Label3D */
            this._label = this._hint.addComponent(Label);
            // �Զ�ָ���������壨3.x ������Դ��������
            this._label.font = builtinResMgr.get('builtin-font');

            /* �� Billboard ������ʼ��������� */
            this._hint.addComponent(Billboard);

            /* �� ��ɫ�����߿ɶ��� */
            const ol = this._hint.addComponent(LabelOutline);
            ol.color.set(0, 0, 0);
            ol.width = 1;
        } else {
            this._label = this._hint.getComponent(Label);
        }

        /* ��ʼ����ʽ */
        if (this._label) {
            this._label.color = this.color;
            this._label.string = '';        // Ĭ���ı�����
        }
        this._hint!.active = false;       // ��������
    }

    update() {
        if (!this.player || !this._hint) return;

        const dis = Vec3.distance(this.player.worldPosition, this.node.worldPosition);
        const visible = dis <= this.radius;

        if (visible !== this._hint.active) {
            this._hint.active = visible;
            if (visible) this.refreshText();
        }
    }

    /** ��ģ��ˢ������ */
    private refreshText() {
        if (!this._label) return;

        const id = (this.getComponent('ItemPickup') as any)?.itemId ?? this.node.name;

        this._label.string = this.template
            .replace('{key}', this.keyName)
            .replace('{id}', id);
    }
}
