export type Tab = "ideate" | "design" | "create";

export interface Theme {
  // Navbar
  navBg: string;
  navBorder: string;
  navText: string;

  // Active tab pill
  tabActiveBg: string;
  tabActiveText: string;
  tabInactiveText: string;

  // Toolbar
  toolbarBg: string;
  toolbarBorder: string;
  toolbarActiveBtn: string;
  toolbarText: string;
  toolbarHover: string;

  // AI bubble
  bubbleBg: string;
  bubbleBorder: string;
  bubbleAccent: string;
  bubbleBtnBg: string;
  bubbleBtnBorder: string;
  bubbleBtnHover: string;

  // Status dot
  thinkingColor: string;

  // Canvas background (tldraw CSS override)
  canvasBg: string;
}

export const themes: Record<Tab, Theme> = {
  ideate: {
    navBg: "bg-[#f5f0eb]",
    navBorder: "border-[#e8dfd6]",
    navText: "text-[#5c4f3d]",

    tabActiveBg: "bg-[#e8daf0]",
    tabActiveText: "text-[#6b4d8a]",
    tabInactiveText: "text-[#a8977e]",

    toolbarBg: "bg-[#f5f0eb]",
    toolbarBorder: "border-[#e8dfd6]",
    toolbarActiveBtn: "bg-[#c5a3d9] text-white",
    toolbarText: "text-[#8a7d6b]",
    toolbarHover: "hover:text-[#5c4f3d] hover:bg-[#ebe3da]",

    bubbleBg: "bg-[#faf7f4]",
    bubbleBorder: "border-[#e8dfd6]",
    bubbleAccent: "text-[#8b6baa]",
    bubbleBtnBg: "bg-[#f0eae4]",
    bubbleBtnBorder: "border-[#e0d5c9]",
    bubbleBtnHover: "hover:bg-[#e8daf0] hover:border-[#c5a3d9] hover:text-[#6b4d8a]",

    thinkingColor: "bg-[#c5a3d9]",
    canvasBg: "#ece5dd",
  },
  design: {
    navBg: "bg-[#eef3f0]",
    navBorder: "border-[#d6e3dc]",
    navText: "text-[#3d5c4f]",

    tabActiveBg: "bg-[#d4e8de]",
    tabActiveText: "text-[#3d6b55]",
    tabInactiveText: "text-[#8aaa97]",

    toolbarBg: "bg-[#eef3f0]",
    toolbarBorder: "border-[#d6e3dc]",
    toolbarActiveBtn: "bg-[#7bb89a] text-white",
    toolbarText: "text-[#6b8a7d]",
    toolbarHover: "hover:text-[#3d5c4f] hover:bg-[#dfe9e3]",

    bubbleBg: "bg-[#f4faf7]",
    bubbleBorder: "border-[#d6e3dc]",
    bubbleAccent: "text-[#4a8b6b]",
    bubbleBtnBg: "bg-[#e4f0ea]",
    bubbleBtnBorder: "border-[#c9e0d5]",
    bubbleBtnHover: "hover:bg-[#d4e8de] hover:border-[#7bb89a] hover:text-[#3d6b55]",

    thinkingColor: "bg-[#7bb89a]",
    canvasBg: "#dde6e0",
  },
  create: {
    navBg: "bg-[#f5f0ea]",
    navBorder: "border-[#e8dcc8]",
    navText: "text-[#5c4a30]",

    tabActiveBg: "bg-[#f0dfc4]",
    tabActiveText: "text-[#8b6520]",
    tabInactiveText: "text-[#b0a08a]",

    toolbarBg: "bg-[#f5f0ea]",
    toolbarBorder: "border-[#e8dcc8]",
    toolbarActiveBtn: "bg-[#d4a054] text-white",
    toolbarText: "text-[#8a7a60]",
    toolbarHover: "hover:text-[#5c4a30] hover:bg-[#ebe0d0]",

    bubbleBg: "bg-[#faf7f2]",
    bubbleBorder: "border-[#e8dcc8]",
    bubbleAccent: "text-[#a07030]",
    bubbleBtnBg: "bg-[#f0e8da]",
    bubbleBtnBorder: "border-[#e0d0b8]",
    bubbleBtnHover: "hover:bg-[#f0dfc4] hover:border-[#d4a054] hover:text-[#8b6520]",

    thinkingColor: "bg-[#d4a054]",
    canvasBg: "#ece3d5",
  },
};
