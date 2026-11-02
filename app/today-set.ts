"use client";

import { useSyncExternalStore } from "react";

// 今日のセットは、このスマホのブラウザ（localStorage）にだけ覚えておく
// 形：{ date: "2026-11-02", ids: ["運動のid", ...] }
const STORAGE_KEY = "rehab-note:today-set";

type SavedTodaySet = { date: string; ids: string[] };

const EMPTY: string[] = [];

// スマホの時計で「今日」の日付（例：2026-11-02）
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // プライベートモードなどで使えないときは「何も選んでいない」にする
    return null;
  }
}

// 同じ中身なら同じ配列を返す（React が「変わっていない」とわかるように）
let cachedKey: string | null = null;
let cachedIds: string[] = EMPTY;

function getSnapshot(): string[] {
  const raw = readRaw();
  const today = todayString();
  const key = `${today}|${raw}`;
  if (key === cachedKey) {
    return cachedIds;
  }
  cachedKey = key;
  cachedIds = EMPTY;
  if (raw) {
    try {
      const saved = JSON.parse(raw) as SavedTodaySet;
      // 日付が変わっていたら空に戻す
      if (saved.date === today && Array.isArray(saved.ids)) {
        cachedIds = saved.ids.filter((id) => typeof id === "string");
      }
    } catch {
      // 壊れた中身は無視する
    }
  }
  return cachedIds;
}

// サーバーでは選んだ内容がわからないので、空として描く
function getServerSnapshot(): string[] {
  return EMPTY;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // ほかのタブで変えたとき・画面に戻ってきたとき（日付が変わったかも）にも読みなおす
  window.addEventListener("storage", listener);
  window.addEventListener("focus", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener("focus", listener);
  };
}

// 今日のセットに選んでいる運動の id の一覧
export function useTodaySet(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// 運動を今日のセットに選ぶ・外す
export function toggleTodaySet(id: string) {
  const ids = getSnapshot();
  const next = ids.includes(id)
    ? ids.filter((selectedId) => selectedId !== id)
    : [...ids, id];
  const saved: SavedTodaySet = { date: todayString(), ids: next };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // 保存できなくても画面が止まらないようにする
  }
  listeners.forEach((listener) => listener());
}
