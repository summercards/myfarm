import {
  _decorator, Component, Node, UITransform, Graphics, Color,
  Label, Vec3, Size, Layers, find, Canvas
} from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SimpleInventoryPanel')
export class SimpleInventoryPanel extends Component {
  @property rows = 4;
  @property cols = 5;
  @property cellSize = 84;
  @property gap = 10;

  @property(Color) panelBg = new Color(0, 0, 0, 150);
  @property(Color) cellBg  = new Color(40, 40, 40, 200);
  @property(Color) textCol = new Color(230, 230, 230, 255);

  onLoad() {
    // 0) 找 Canvas，并把自己“搬运”到 Canvas 下面
    const canvasNode = find('Canvas');
    if (!canvasNode) {
      console.error('[SimpleInventoryPanel] 找不到 Canvas 节点！');
      return;
    }
    // 如果不在 Canvas 下 -> 重新挂接
    if (this.node.parent !== canvasNode) {
      this.node.removeFromParent();
      canvasNode.addChild(this.node);
    }

    // 1) 强制 UI 层 + 排到最顶层
    this.node.layer = Layers.Enum.UI_2D;
    this.node.setSiblingIndex(this.node.parent!.children.length - 1);

    // 2) 重置变换（避免被 3D 旋转/缩放影响）
    this.node.setPosition(0, 0, 0);
    this.node.setScale(1, 1, 1);
    this.node.setRotationFromEuler(0, 0, 0);

    // 3) 确保 Canvas 组件和 UI 相机正常（不是必须，但能避免奇怪配置）
    const canvasComp = canvasNode.getComponent(Canvas);
    if (!canvasComp) {
      canvasNode.addComponent(Canvas);
    }

    // 4) 确保有 UITransform，并给明确尺寸
    const ui = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
    ui.setContentSize(new Size(640, 420));
    ui.anchorPoint.set(0.5, 0.5); // 居中

    // 5) 延后一帧绘制，等一切就绪
    this.scheduleOnce(this.build, 0);
  }

  private build = () => {
    const pad = 16;
    const w = this.cols * this.cellSize + (this.cols - 1) * this.gap + pad * 2;
    const h = this.rows * this.cellSize + (this.rows - 1) * this.gap + pad * 2;

    // 背景面板
    let bg = this.node.getChildByName('PanelBG');
    if (!bg) {
      bg = new Node('PanelBG');
      this.node.addChild(bg);
      bg.addComponent(UITransform);
      bg.addComponent(Graphics);
    }
    const g = bg.getComponent(Graphics)!;
    g.clear();
    g.fillColor = this.panelBg;
    g.roundRect(-w / 2, -h / 2, w, h, 10);
    g.fill();

    // 中央诊断标题（一定能看到）
    let title = this.node.getChildByName('DebugTitle');
    if (!title) {
      title = new Node('DebugTitle');
      const lb = title.addComponent(Label);
      lb.string = 'INVENTORY UI';
      lb.fontSize = 32;
      lb.lineHeight = 36;
      lb.color = this.textCol;
      this.node.addChild(title);
    }
    title!.setPosition(0, h / 2 - 28, 0);

    // 清理旧格子
    for (const child of [...this.node.children]) {
      if (child.name.startsWith('Cell_')) child.destroy();
    }

    // 逐格绘制（不依赖 Layout）
    const startX = - (this.cols * this.cellSize + (this.cols - 1) * this.gap) / 2;
    const startY =   (this.rows * this.cellSize + (this.rows - 1) * this.gap) / 2;

    let idx = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = new Node(`Cell_${idx}`);
        this.node.addChild(cell);

        const cg = cell.addComponent(Graphics);
        cg.fillColor = this.cellBg;
        cg.clear();
        cg.roundRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize, 8);
        cg.fill();

        const labelNode = new Node('Index');
        const lb = labelNode.addComponent(Label);
        lb.color = this.textCol;
        lb.fontSize = 16;
        lb.string = `${idx}`;
        labelNode.setPosition(new Vec3(0, 0, 0));
        cell.addChild(labelNode);

        const x = startX + c * (this.cellSize + this.gap) + this.cellSize / 2;
        const y = startY - r * (this.cellSize + this.gap) - this.cellSize / 2;
        cell.setPosition(new Vec3(x, y, 0));

        idx++;
      }
    }

    console.log('[SimpleInventoryPanel] ready at Canvas center. layer=UI_2D, size=', this.rows, 'x', this.cols);
  }
}
