export enum ItemActionType {
  None,
  Eat,          // 食用，恢复体力/饥饿
  Plant,        // 种植（交给种植系统）
  ToolUse,      // 工具使用（交给工具系统）
  Place,        // 放置一个世界对象（例如栅栏、工作台）
  Custom        // 自定义（以后扩展）
}
