"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span>メールアドレス</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded-xl border border-zinc-300 px-4 py-3 text-xl"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span>パスワード</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="rounded-xl border border-zinc-300 px-4 py-3 text-xl"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-teal-600 py-4 text-xl font-bold text-white disabled:opacity-60"
      >
        {pending ? "ログイン中…" : "ログイン"}
      </button>
    </form>
  );
}
