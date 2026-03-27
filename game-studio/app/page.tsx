"use client";

import dynamic from "next/dynamic";
import { palette } from "@/lib/themes";

const App = dynamic(() => import("@/components/App"), {
  ssr: false,
  loading: () => (
    <div
      className="h-screen w-screen flex items-center justify-center"
      style={{ backgroundColor: palette.bg }}
    >
      <span style={{ color: palette.textMuted }} className="text-sm">Loading...</span>
    </div>
  ),
});

export default function Home() {
  return <App />;
}
