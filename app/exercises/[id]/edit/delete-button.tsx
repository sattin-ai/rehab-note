"use client";

import { useActionState } from "react";
import type { DeleteExerciseState } from "../../actions";

type Props = {
  action: (prevState: DeleteExerciseState) => Promise<DeleteExerciseState>;
};

const initialState: DeleteExerciseState = { error: null };

// 押すと確認を出し、「OK」のときだけ運動を消す
export function DeleteButton({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "本当に消しますか？\n写真も全部消えて、元に戻せません。",
          )
        ) {
          event.preventDefault();
        }
      }}
      className="flex flex-col gap-3"
    >
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border-2 border-red-600 min-h-14 py-3 text-body font-bold text-red-600 disabled:opacity-60"
      >
        {pending ? "削除中…" : "この運動を削除"}
      </button>
      {state.error && (
        <p role="alert" className="text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
