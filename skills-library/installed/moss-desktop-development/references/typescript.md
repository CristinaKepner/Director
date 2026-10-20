# TypeScript 严格类型约束

## 共享基线

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

这是约束片段，不是可直接覆盖项目的完整 tsconfig。模块解析、编译目标、输出和项目引用按实际运行环境及工具链配置；先检查现有配置的有效继承结果。

## 类型表达与边界

- 外部未知数据使用 `unknown`，经校验与收窄进入领域层。内部可信数据不逐层重新解析。
- 不使用 `any`、双重断言、非空断言绕过问题；必要的第三方兼容局限在适配器，说明可验证依据。
- 区分缺失、`undefined` 和 `null`，不为消除报错任意扩大联合。可选字段是否可显式赋 undefined 由契约决定。
- 处理数组和字典索引不存在的情况；默认值必须有业务含义，不能伪造正常结果。
- 可辨识联合表达互斥状态；关键状态分支做穷尽检查，新增状态不得静默落入“成功”或空值。
- 公共输入输出显式表达，局部变量优先推断。必要时使用 `satisfies` 校验结构，避免断言强改类型。
- 调用者不应修改的数据使用 `readonly`；它不保证运行时不可变或自动深度只读。
- 业务契约不泄漏 Semi、React Flow、数据库行、Electron 和模型 SDK 的类型；仅在有实际边界差异时转换，不机械复制同构类型。

## 配置与执行

- 渲染、宿主、共享领域与测试按实际需要分配置并继承严格基线。领域模块不无意获得 DOM、Electron 或 Vitest 全局类型。
- Vite 解析别名及必要转换与测试配置保持一致，但运行环境的模块设置不能机械共用。
- 提供独立 `typecheck` 命令，覆盖业务、适配器及测试。单项目可以 `tsc --noEmit`；多项目按实际引用及 emit 策略检查，不遗漏根配置 references 下的子项目。
- Vite 构建、`vitest run` 和类型检查分别执行；Vitest 普通运行不证明类型正确。
- 重要公共契约按需添加类型测试，包含合法输入与非法状态。使用 Vitest 类型断言或 `@ts-expect-error` 反例时，明确接入实际类型检查入口。
- 不为过关关闭严格选项、排除出错源码或添加宽泛模块声明；禁止 `@ts-ignore` 静默压制。
- 临时 `@ts-expect-error` 说明原因和移除条件。类型反例中的该指令属于预期断言，不当作待删除豁免。
- `strict` 不禁止显式 any，必要时通过现有 lint 检查显式 any 与不安全使用；不要把规则数量当作质量指标。
- 第三方声明问题优先版本对齐或局部修复。若使用 `skipLibCheck`，记录原因及声明文件漏检范围，不能借此跳过业务类型检查。
- 在 package.json 中精确固定 TypeScript 版本，不使用范围前缀，并提交锁文件。升级时审查新增诊断，不批量加断言或降级选项。

## 既有代码严格化

新项目从创建时启用。旧项目先评估错误范围，按模块推进，不把无关的大修混入功能任务。明确未达标范围，已严格化的模块不得退回宽松配置。不要声称严格类型能替代运行时验证、跨进程契约测试或跨语言迁移。

## 官方参考

- [strict](https://www.typescriptlang.org/tsconfig/strict.html)
- [noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html)
- [exactOptionalPropertyTypes](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html)
- [noImplicitOverride](https://www.typescriptlang.org/tsconfig/noImplicitOverride.html)
- [noPropertyAccessFromIndexSignature](https://www.typescriptlang.org/tsconfig/noPropertyAccessFromIndexSignature.html)
