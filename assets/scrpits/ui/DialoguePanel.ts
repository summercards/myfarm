/* assets/scrpits/ui/DialoguePanel.ts
 * 简易对话面板（标题=NPC名，内容=当前句，按钮=下一句/关闭 + 商店）
 * 使用：场景下已有 Canvas/DialoguePanel 节点时，直接通过 DialoguePanel.instance().open(...)
 */
import { _decorator, Component, Node, Label, Button, find } from 'cc';
import { ShopWindow } from './shop/ShopWindow';
import { ShopContext } from '../npc/ShopContext';

const { ccclass, property } = _decorator;

type OpenArgs = {
    speaker: string;
    lines: string[];
    onClose?: () => void;
};

@ccclass('DialoguePanel')
export class DialoguePanel extends Component {
    /** 单例查找：优先 Canvas/DialoguePanel，找不到再兜底用名称搜索 */
    public static instance(): DialoguePanel | null {
        let n = find('Canvas/DialoguePanel');
        if (!n) {
            const canvas = find('Canvas');
            n = canvas?.getChildByName('DialoguePanel') ?? null;
        }
        return n?.getComponent(DialoguePanel) ?? null;
    }

    @property(Node)  panelRoot: Node | null = null;
    @property(Label) speakerLabel: Label | null = null;
    @property(Label) contentLabel: Label | null = null;
    @property(Button) nextBtn: Button | null = null;
    @property(Button) shopBtn: Button | null = null;   // Inspector 里把“商店”按钮拖进来

    private _lines: string[] = [];
    private _idx = 0;
    private _onClose: (() => void) | null = null;

    onLoad() {
        // 若未指定 panelRoot，则默认用脚本所在节点
        if (!this.panelRoot) this.panelRoot = this.node;

        this._setVisible(false);

        if (this.nextBtn) {
            this.nextBtn.node.on(Button.EventType.CLICK, this.onClickNext, this);
        }
        if (this.shopBtn) {
            this.shopBtn.node.on(Button.EventType.CLICK, this.onClickShop, this);
        }
    }

    onDestroy() {
        if (this.nextBtn) {
            this.nextBtn.node.off(Button.EventType.CLICK, this.onClickNext, this);
        }
        if (this.shopBtn) {
            this.shopBtn.node.off(Button.EventType.CLICK, this.onClickShop, this);
        }
    }

    /** 打开对话 */
    public open(args: OpenArgs) {
        this._lines = args.lines ?? [];
        this._idx = 0;
        this._onClose = args.onClose ?? null;

        if (this.speakerLabel) this.speakerLabel.string = args.speaker ?? 'NPC';

        this._setVisible(true);
        this._refresh();
    }

    /** 关闭对话（会触发 onClose 一次） */
    public close() {
        this._setVisible(false);
        if (this._onClose) {
            const cb = this._onClose;
            this._onClose = null;
            cb();
        }
    }

    /** 商店按钮：使用当前 NPC 上下文打开商店 */
    private onClickShop() {
        const npc = ShopContext.currentNPC;
        if (!npc) {
            console.warn('[DialoguePanel] 没有当前 NPC 上下文');
            return;
        }
        ShopWindow.openForNPC(npc); // GameRoot / play 由 ShopWindow 内部自动查找
    }

    /** 下一句/关闭 */
    public onClickNext() {
        if (this._idx < this._lines.length - 1) {
            this._idx++;
            this._refresh();
        } else {
            this.close();
        }
    }

    private _refresh() {
        if (this.contentLabel) {
            this.contentLabel.string = this._lines[this._idx] ?? '';
        }
        // 如需根据状态隐藏“下一句”或“商店”，可在此处按需求控制按钮显隐
    }

    private _setVisible(v: boolean) {
        if (this.panelRoot) this.panelRoot.active = v;
        else this.node.active = v;
    }
}
