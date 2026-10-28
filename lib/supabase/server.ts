import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

// サーバー側（Server Component / Server Action）で使う Supabase クライアント
export async function createClient() {
  // Supabase は内部で現在時刻を読むので、作り置き（プリレンダー）せずリクエスト時に実行する
  await connection();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component からは書き込めない。proxy.ts が更新するので無視してよい
          }
        },
      },
    },
  );
}
