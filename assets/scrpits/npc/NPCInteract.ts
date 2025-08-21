/*  NPCInteract.ts（R 键 + 调试日志 + 触发器离开/距离超出自动关闭）
 *  兼容 3.8.x：触发器事件用字符串；对话数组用 CCString[]
 */
import {
    _decorator, Component, input, Input, EventKeyboard, KeyCode,
    Collider, Enum, CCString, Node, Vec3, find,
} from 'cc';
import { NPCController } from './NPCController';
import { DialoguePanel } from '../ui/DialoguePanel';
import { InteractHint } from '../ui/InteractHint';
const { ccclass, property } = _decorator;

@ccclass('NPCInteract')
export class NPCInteract extends Component {
    /** 台词（逐句） */
    @property({ type: [CCString] })
    public dialogues: string[] = ['今天天气真好！', '需要帮助就来找我。'];

    /** 交互键（默认 R） */
    @property({ type: Enum(KeyCode) })
    public interactKey: number = KeyCode.KEY_R;

    /** 打开后打印进入/离开/按键/开始对话/关闭对话等日志 */
    @property
    public enableDebugLog: boolean = true;

    /** 关联的 NPC 控制器（留空自动取同节点组件） */
    @property({ type: NPCController })
    public npcCtrl: NPCController | null = null;

    /** （可选）玩家节点；若设置，将按距离自动关闭对话 */
    @property({ type: Node })
    public player: Node | null = null;

    /** （可选）距离阈值，玩家距离 NPC 超过该值时强制关闭对话 */
    @property
    public autoCloseDistance: number = 4.0;

    private _playerInside = false;
    private _talkingLocal = false;   // 本 NPC 当前是否打开了对话

    private static _TMP_A = new Vec3();

    onLoad() {
        if (!this.npcCtrl) this.npcCtrl = this.getComponent(NPCController);
        // 尝试自动查找玩家（找不到也没关系）
        if (!this.player) this.player = find('player') || find('Player') || null;
    }

    onEnable() {
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);

        const col = this.getComponent(Collider);
        if (col) {
            (col as any).on('onTriggerEnter', this._onTriggerEnter, this);
            (col as any).on('onTriggerExit', this._onTriggerLeave, this);
        } else {
            this._log('缺少 Collider(IsTrigger=true)，将无法触发对话提示');
        }
    }

    onDisable() {
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);

        const col = this.getComponent(Collider);
        if (col) {
            (col as any).off('onTriggerEnter', this._onTriggerEnter, this);
            (col as any).off('onTriggerExit', this._onTriggerLeave, this);
        }
    }

    update() {
        // 距离超出时强制关闭（可选）
        if (this._talkingLocal && this.player && this.autoCloseDistance > 0) {
            const a = this.node.worldPosition;
            const b = this.player.worldPosition;
            Vec3.subtract(NPCInteract._TMP_A, a, b);
            if (NPCInteract._TMP_A.length() > this.autoCloseDistance) {
                this._log(`距离>${this.autoCloseDistance}m，强制关闭对话`);
                DialoguePanel.instance()?.close(); // 会回调 onClose
            }
        }
    }

    private _onTriggerEnter(e: any) {
        this._playerInside = true;
        this._log('TRIGGER_ENTER from:', e?.otherCollider?.node?.name ?? '(unknown)');
        InteractHint.instance()?.show(`按 ${this._keyName()} 与【${this.npcCtrl?.npcName ?? 'NPC'}】对话`);
    }

    private _onTriggerLeave(e: any) {
        this._playerInside = false;
        this._log('TRIGGER_EXIT  from:', e?.otherCollider?.node?.name ?? '(unknown)');
        InteractHint.instance()?.hide();

        // 离开触发区域：若正在对话则立即关闭
        if (this._talkingLocal) {
            this._log('离开区域 → 关闭对话');
            DialoguePanel.instance()?.close(); // onClose 里会恢复行走，并把 _talkingLocal 复位
        }
    }

    private _onKeyDown(e: EventKeyboard) {
        if (e.keyCode !== this.interactKey) return; // 只响应 R
        this._log('KEY_DOWN:', this._keyName(), 'playerInside =', this._playerInside);
        if (!this._playerInside) return;
        this.startDialogue();
    }

    /** 也可给手机端按钮调用 */
    public startDialogue() {
        if (!this.npcCtrl || this.dialogues.length === 0) {
            this._log('startDialogue 被调用，但 npcCtrl 或 dialogues 为空');
            return;
        }
        this._log('startDialogue → 打开对话面板');
        this._talkingLocal = true;
        this.npcCtrl.setTalking(true);
        InteractHint.instance()?.hide();

        DialoguePanel.instance()?.open({
            speaker: this.npcCtrl.npcName,
            lines: this.dialogues.slice(),
            onClose: () => {
                this._log('对话关闭 → 恢复移动');
                this._talkingLocal = false;
                this.npcCtrl?.setTalking(false);
            },
        });
    }

    /* 工具 */
    private _keyName(): string {
        const n = KeyCode[this.interactKey] ?? '';
        return n.startsWith('KEY_') ? n.slice(4) : n; // KEY_R -> R
    }
    private _log(...args: any[]) {
        if (!this.enableDebugLog) return;
        console.log(`[NPCInteract][${this.node.name}]`, ...args);
    }
}
