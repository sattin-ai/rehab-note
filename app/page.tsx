import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12 text-lg">
      <h1 className="text-3xl font-bold">リハビリ運動ノート</h1>
      <Suspense fallback={<p>読み込み中…</p>}>
        <CurrentUser />
      </Suspense>
    </main>
  );
}

async function CurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      <p>ログイン中：{user.email}</p>
      <form action={logout}>
        <button
          type="submit"
          className="w-full rounded-xl border border-zinc-400 py-4 text-xl"
        >
          ログアウト
        </button>
      </form>
    </div>
  );
}
