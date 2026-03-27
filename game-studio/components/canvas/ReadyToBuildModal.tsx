"use client";

import { palette } from "@/lib/themes";

interface ReadyToBuildModalProps {
  onReview: () => void;
  onAddMore: () => void;
}

export default function ReadyToBuildModal({ onReview, onAddMore }: ReadyToBuildModalProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto">
      {/* Dimmed backdrop */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />

      {/* Modal */}
      <div
        className="relative rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full mx-4"
        style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderLight}` }}
      >
        {/* Accent bar */}
        <div className="h-1" style={{ backgroundColor: palette.accent }} />

        <div className="p-6 text-center">
          <div className="text-3xl mb-3">🎮</div>
          <h2 className="text-lg font-bold mb-1" style={{ color: palette.textPrimary }}>
            Ready to build V1!
          </h2>
          <p className="text-sm mb-6" style={{ color: palette.textMuted }}>
            Your game design is solid enough to start building. Review your game plan, then start building!
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={onReview}
              className="w-full py-3 text-sm font-semibold rounded-xl text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: palette.accent }}
            >
              Review my game →
            </button>
            <button
              onClick={onAddMore}
              className="w-full py-2.5 text-sm font-medium rounded-xl transition-colors"
              style={{
                backgroundColor: palette.bgCardHover,
                color: palette.textMuted,
                border: `1px solid ${palette.border}`,
              }}
            >
              I want to add more first
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
