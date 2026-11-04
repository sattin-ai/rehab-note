"use client";

import Link from "next/link";
import type { ExerciseTile } from "../exercises/get-exercise-tiles";
import { TilePhoto } from "../tile-photo";
import { useTodaySet } from "../today-set";

// 今日のセットに選んだ運動と合計時間
export function TodayList({ tiles }: { tiles: ExerciseTile[] }) {
  const selectedIds = useTodaySet();
  // 並び順は一覧と同じ（登録した順）。消した運動は出さない
  const selectedTiles = tiles.filter((tile) => selectedIds.includes(tile.id));
  const totalMinutes = selectedTiles.reduce(
    (sum, tile) => sum + tile.duration_minutes,
    0,
  );

  if (selectedTiles.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p>まだ選ばれていません。</p>
        <Link
          href="/"
          className="rounded-xl border-2 border-teal-600 min-h-14 py-3 text-center text-body font-bold text-teal-700"
        >
          一覧で今日のセットを選ぶ
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="flex items-baseline gap-3">
        <span className="text-heading font-bold">合計</span>
        <span className="text-6xl font-bold text-teal-700">{totalMinutes}</span>
        <span className="text-heading font-bold">分</span>
        <span className="ml-auto text-zinc-600">{selectedTiles.length}こ</span>
      </p>
      <ul className="flex flex-col gap-4">
        {selectedTiles.map((tile) => (
          <li key={tile.id}>
            <Link
              href={`/exercises/${tile.id}?from=today`}
              className="flex items-center gap-4"
            >
              <div className="w-28 shrink-0">
                <TilePhoto
                  photoUrl={tile.photoUrl}
                  alt={tile.name}
                  sizes="112px"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-heading font-bold break-words">{tile.name}</p>
                <p className="text-zinc-600">{tile.duration_minutes}分</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
