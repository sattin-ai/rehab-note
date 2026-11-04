"use client";

import { useState } from "react";
import Link from "next/link";
import type { ExerciseTile } from "./exercises/get-exercise-tiles";
import { TilePhoto } from "./tile-photo";
import { toggleTodaySet, useTodaySet } from "./today-set";

// 一覧のタイル。ふだんは押すと詳しいページ、選ぶモードでは今日のセットに選ぶ・外す
export function ExerciseGrid({ tiles }: { tiles: ExerciseTile[] }) {
  const [isSelecting, setIsSelecting] = useState(false);
  const selectedIds = useTodaySet();

  // 消した運動の id が残っていても数えない
  const selectedTiles = tiles.filter((tile) => selectedIds.includes(tile.id));
  const totalMinutes = selectedTiles.reduce(
    (sum, tile) => sum + tile.duration_minutes,
    0,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSelecting((value) => !value)}
        className={
          isSelecting
            ? "rounded-xl bg-teal-600 min-h-14 py-3 text-body font-bold text-white"
            : "rounded-xl border-2 border-teal-600 min-h-14 py-3 text-body font-bold text-teal-700"
        }
      >
        {isSelecting ? "選び終わる" : "今日のセットを選ぶ"}
      </button>
      {isSelecting && (
        <p className="-mt-4">やる運動を押して選びます。もう一度押すと外れます。</p>
      )}

      <ul className="grid grid-cols-3 gap-3">
        {tiles.map((tile) => {
          const isSelected = selectedIds.includes(tile.id);
          const content = (
            <>
              <div className="relative">
                <TilePhoto
                  photoUrl={tile.photoUrl}
                  alt={tile.name}
                  sizes="33vw"
                />
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white"
                  >
                    ✓
                  </span>
                )}
              </div>
              <p className="line-clamp-2 text-note font-bold leading-snug break-words">
                {tile.name}
              </p>
              <p className="text-note text-zinc-600">
                {tile.duration_minutes}分
              </p>
            </>
          );
          return (
            <li key={tile.id}>
              {isSelecting ? (
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleTodaySet(tile.id)}
                  className={`flex w-full flex-col gap-1 rounded-2xl p-1 text-left outline-4 ${
                    isSelected ? "outline outline-teal-600" : ""
                  }`}
                >
                  {content}
                </button>
              ) : (
                <Link
                  href={`/exercises/${tile.id}`}
                  className={`flex flex-col gap-1 rounded-2xl p-1 outline-4 ${
                    isSelected ? "outline outline-teal-600" : ""
                  }`}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {selectedTiles.length > 0 && (
        <div className="sticky bottom-4">
          <Link
            href="/today"
            className="block rounded-xl bg-teal-600 min-h-14 py-3 text-center text-body font-bold text-white shadow-lg"
          >
            今日のセットを見る（合計{totalMinutes}分）
          </Link>
        </div>
      )}
    </>
  );
}
