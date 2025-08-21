/*  DialoguePanel.ts
 *  功能：最简单的对话面板（标题=NPC名，正文=逐句显示，按钮=下一句/关闭）
 *  使用：场景 Canvas 下放一个对话面板节点，挂本脚本，拖引用。
 */
import { _decorator, Component, Node, Label, Button, find } from 'cc';
const { ccclass, property } = _decorator;

type OpenArgs = {
    speaker: string;
    lines: string[];
    onClose?: () => void;
};

@ccclass('DialoguePanel')
export class DialoguePanel extends Component {
    /** 单例查找（Canvas 下节点名默认 "DialoguePanel"） */
    public static instance(): DialoguePanel | null {
        const n = find('Canvas/DialoguePanel');
        return n?.getComponent(DialoguePanel) ?? null;
    }

    @property(Node) panelRoot: Node | null = null;
    @property(Label) speakerLabel: Label | null = null;
    @property(Label) contentLabel: Label | null = null;
    @property(Button) nextBtn: Button | null = null;

    private _lines: string[] = [];
    private _idx = 0;
    private _onClose: (() => void) | null = null;

    onLoad() {
        this._setVisible(false);
        if (this.nextBtn) {
            this.nextBtn.node.on(Button.EventType.CLICK, this.onClickNext, this);
        }
    }

    onDestroy() {
        if (this.nextBtn) {
            this.nextBtn.node.off(Button.EventType.CLICK, this.onClickNext, this);
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

    public close() {
        this._setVisible(false);
        if (this._onClose) {
            const cb = this._onClose;
            this._onClose = null;
            cb();
        }
    }

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
        // 按钮文案可根据是否最后一句自行换（可选）
    }

    private _setVisible(v: boolean) {
        if (this.panelRoot) this.panelRoot.active = v;
        else this.node.active = v;
    }
}
