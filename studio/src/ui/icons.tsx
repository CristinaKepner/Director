import React from 'react'

/* ─────────────────────────────────────────────────────────────
   图标库(lucide / tabler 原始路径)
   统一签名:{ size?: number; className?: string; strokeWidth?: number }
   默认:24 网格、fill none、stroke currentColor、圆头圆角、线宽 1.75
   ───────────────────────────────────────────────────────────── */

export interface IconProps {
  size?: number
  className?: string
  strokeWidth?: number
}

interface SvgProps extends IconProps {
  /** viewBox,默认 24 网格 */
  vb?: string
  children: React.ReactNode
}

const Svg = ({ size = 24, className, strokeWidth = 1.75, vb = '0 0 24 24', children }: SvgProps) => (
  <svg
    width={size}
    height={size}
    viewBox={vb}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
)

/* ── 导航 / 箭头 ─────────────────────────────────────────────── */

export const IconArrowLeft = (p: IconProps) => (
  <Svg {...p}><path d="M12 19l-7-7 7-7" /><path d="M19 12H5" /></Svg>
)
export const IconBack = IconArrowLeft

export const IconChevronDown = (p: IconProps) => <Svg {...p}><path d="M6 9l6 6l6-6" /></Svg>
export const IconChevronUp = (p: IconProps) => <Svg {...p}><path d="M6 15l6-6l6 6" /></Svg>
export const IconChevronRight = (p: IconProps) => <Svg {...p}><path d="M9 6l6 6l-6 6" /></Svg>
export const IconChevronLeft = (p: IconProps) => <Svg {...p}><path d="M15 6l-6 6l6 6" /></Svg>

/** 下拉箭头;up 时朝上(MainBar 子菜单沿用) */
export const IconCaret = ({ up, ...p }: IconProps & { up?: boolean }) =>
  up ? <IconChevronUp {...p} /> : <IconChevronDown {...p} />

/* ── 场景 / 视图 ─────────────────────────────────────────────── */

export const IconCamera = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </Svg>
)

export const IconSphere = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a15 15 0 0 1 0 18" />
    <path d="M12 3a15 15 0 0 0 0 18" />
  </Svg>
)
export const IconEnv = IconSphere

export const IconHistory = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 8l0 4l2 2" />
    <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
  </Svg>
)

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)
export const IconGear = IconSettings

export const IconKeyboard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 10h.01" /><path d="M10 10h.01" /><path d="M14 10h.01" /><path d="M18 10h.01" />
    <path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" />
    <path d="M7 16.5h10" />
  </Svg>
)

export const IconLocate = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2v3" /><path d="M12 19v3" /><path d="M2 12h3" /><path d="M19 12h3" />
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)
export const IconCrosshair = IconLocate
export const IconLocateFixed = IconLocate

/* ── 编辑 / 历史 ─────────────────────────────────────────────── */

export const IconUndo = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
  </Svg>
)
export const IconUndo2 = IconUndo

export const IconRedo = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
  </Svg>
)
export const IconRedo2 = IconRedo

export const IconMousePointer = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
  </Svg>
)
export const IconMousePointer2 = IconMousePointer
export const IconPointer = IconMousePointer

export const IconBox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </Svg>
)
export const IconCube = IconBox

export const IconPlus = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14" /><path d="M12 5v14" /></Svg>
)

export const IconMinus = (p: IconProps) => <Svg {...p}><path d="M5 12h14" /></Svg>

export const IconClapper = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
    <path d="m6.2 5.3 3.1 3.9" />
    <path d="m12.4 3.4 3.1 4" />
    <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </Svg>
)
export const IconClapperboard = IconClapper

export const IconTimeline = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 5v11" /><path d="M12 5v6" /><path d="M18 5v14" />
  </Svg>
)
export const IconGantt = IconTimeline
export const IconChartGantt = IconTimeline

export const IconPerson = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 0 0-16 0" />
  </Svg>
)
export const IconUser = IconPerson
export const IconUserRound = IconPerson

export const IconPersonStanding = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="5" r="1" />
    <path d="m9 20 3-6 3 6" />
    <path d="m6 8 6 2 6-2" />
    <path d="M12 10v4" />
  </Svg>
)

export const IconX = (p: IconProps) => (
  <Svg {...p}><path d="M18 6L6 18" /><path d="M6 6l12 12" /></Svg>
)
export const IconClose = IconX

/* ── 播放 / 循环 ─────────────────────────────────────────────── */

export const IconPlay = (p: IconProps) => (
  <Svg {...p}><polygon points="6 3 20 12 6 21" fill="currentColor" stroke="none" /></Svg>
)

export const IconPause = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" />
    <rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconStop = (p: IconProps) => (
  <Svg {...p}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" /></Svg>
)

export const IconRewind = (p: IconProps) => (
  <Svg {...p}>
    <polygon points="11 19 2 12 11 5" fill="currentColor" stroke="none" />
    <polygon points="22 19 13 12 22 5" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconLoop = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12v-3a3 3 0 0 1 3-3h13m-3-3l3 3l-3 3" />
    <path d="M20 12v3a3 3 0 0 1-3 3H4m3 3l-3-3l3-3" />
  </Svg>
)
export const IconRepeat = IconLoop

export const IconLoopOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12v-3a3 3 0 0 1 3-3h13m-3-3l3 3l-3 3" />
    <path d="M20 12v3a3 3 0 0 1-3 3H4m3 3l-3-3l3-3" />
    <path d="M3 3l18 18" />
  </Svg>
)
export const IconRepeatOff = IconLoopOff

/* ── 对象操作 ────────────────────────────────────────────────── */

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M10 11v6" /><path d="M14 11v6" />
  </Svg>
)
export const IconTrash2 = IconTrash

export const IconDots = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
  </Svg>
)
export const IconEllipsis = IconDots
export const IconMoreHorizontal = IconDots

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
)

export const IconUnlock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </Svg>
)

export const IconFocus = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)
export const IconFocus2 = IconFocus

export const IconGamepad = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 11h4" /><path d="M8 9v4" /><path d="M15 12h.01" /><path d="M18 10h.01" />
    <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
  </Svg>
)
export const IconGamepad2 = IconGamepad

export const IconMonitor = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8" /><path d="M12 17v4" />
  </Svg>
)

export const IconFileExport = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <path d="M11.5 21h-4.5a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2h7l5 5v5m-5 5h7m-3-3l3 3l-3 3" />
  </Svg>
)
export const IconExport = IconFileExport

/** 画幅比例(16 网格) */
export const IconAspect = ({ size = 16, strokeWidth = 1.5, ...p }: IconProps) => (
  <Svg {...p} size={size} strokeWidth={strokeWidth} vb="0 0 16 16">
    <rect x="1.5" y="4.5" width="13" height="7" rx="1.5" />
  </Svg>
)

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </Svg>
)

export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8" y="8" width="14" height="14" rx="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </Svg>
)

export const IconEdit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="m15 5 4 4" />
  </Svg>
)
export const IconPencil = IconEdit

export const IconCheck = (p: IconProps) => <Svg {...p}><path d="M20 6L9 17l-5-5" /></Svg>

export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </Svg>
)

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </Svg>
)

export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </Svg>
)

export const IconLamp = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M12 3.5a5 5 0 0 1 2.5 9.3c-.6.3-1 1-1 1.7v.5h-3v-.5c0-.7-.4-1.4-1-1.7A5 5 0 0 1 12 3.5zM10 18.5h4M10.5 21h3"
      fill="currentColor"
      stroke="none"
    />
  </Svg>
)
export const IconBulb = IconLamp

export const IconGround = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 17l6-3 4 2 6-3" />
    <path d="M4 20h16" />
    <circle cx="12" cy="7" r="3" />
  </Svg>
)

export const IconPoint3d = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="2.4" />
    <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4" />
  </Svg>
)

/* ── Agent / 灯光 / 故事板 ───────────────────────────────────── */

export const IconSparkles = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" /><path d="M22 5h-4" /><path d="M4 17v2" /><path d="M5 18H3" />
  </Svg>
)

export const IconSend = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
    <path d="m21.854 2.147-10.94 10.939" />
  </Svg>
)

export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

export const IconEyeOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <path d="m2 2 20 20" />
  </Svg>
)

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" /><path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" /><path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
  </Svg>
)

export const IconImage = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </Svg>
)

export const IconVideo = (p: IconProps) => (
  <Svg {...p}>
    <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
  </Svg>
)

export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" />
  </Svg>
)

/* ── 操控模式补充(lucide arrow-down / arrow-up / arrow-down-to-line) ── */

export const IconArrowDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </Svg>
)

export const IconArrowUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </Svg>
)

export const IconArrowDownToLine = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 17V3" />
    <path d="m6 11 6 6 6-6" />
    <path d="M19 21H5" />
  </Svg>
)
