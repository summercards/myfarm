/*  NPCInteract.ts（Cocos 3.8.6 适配版）
 *  - 进入触发器显示提示，按 E 打开对话
 *  - 事件改用 Collider.EventType，避免 TriggerEventType 的类型/值冲突
 */
import {
    _decorator, Component, input, Input, EventKeyboard, KeyCode,
    ITriggerEvent, Collider,
} from 'cc';
import { NPCController } from './NPCController';
import { DialoguePanel } from '../ui/DialoguePanel';
import { InteractHint } from '../ui/InteractHint';
const { ccclass, property } = _decorator;

@ccclass('NPCInteract')
export class NPCInteract extends Component {
    @property({ type: [String] })
    public dialogues: string[] = ['今天天气真好！', '需要帮助就来找我。'];

    @property({ type: NPCController })
    public npcCtrl: NPCController | null = null;

    private _playerInside = false;

    onLoad() {
        if (!this.npcCtrl) {
            this.npcCtrl = this.getComponent(NPCController);
        }
    }

    onEnable() {
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);

        const col = this.getComponent(Collider);
        if (col) {
            col.on(Collider.EventType.TRIGGER_ENTER, this._onTriggerEnter, this);
            col.on(Collider.EventType.TRIGGER_EXIT, this._onTriggerLeave, this);
        }
    }

    onDisable() {
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);

        const col = this.getComponent(Collider);
        if (col) {
            col.off(Collider.EventType.TRIGGER_ENTER, this._onTriggerEnter, this);
            col.off(Collider.EventType.TRIGGER_EXIT, this._onTriggerLeave, this);
        }
    }

    private _onTriggerEnter(e: ITriggerEvent) {
        this._playerInside = true;
        InteractHint.instance()?.show(`按 E 与【${this.npcCtrl?.npcName ?? 'NPC'}】对话`);
    }

    private _onTriggerLeave(e: ITriggerEvent) {
        this._playerInside = false;
        InteractHint.instance()?.hide();
    }

    private _onKeyDown(e: EventKeyboard) {
        if (!this._playerInside) return;
        if (e.keyCode !== KeyCode.KEY_E) return;
        this.startDialogue();
    }

    /** 也可供 UI 按钮调用 */
    public startDialogue() {
        if (!this.npcCtrl || this.dialogues.length === 0) return;

        this.npcCtrl.setTalking(true);
        InteractHint.instance()?.hide();

        DialoguePanel.instance()?.open({
            speaker: this.npcCtrl.npcName,
            lines: this.dialogues.slice(),
            onClose: () => this.npcCtrl?.setTalking(false),
        });
    }
}
