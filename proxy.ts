import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// 門番：すべてのページの前に動き、ログインしているか確認する
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 画像・CSS・JS などのファイルは対象外
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
