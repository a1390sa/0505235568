"use client";

import { useActionState } from "react";
import { joinFamily, type ActionResult } from "@/app/actions/family";

const initialState: ActionResult = undefined;

export function JoinFamilyForm({ token }: { token: string }) {
  const boundAction = joinFamily.bind(null, token);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 w-full max-w-sm">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="text-sm font-medium text-foreground">
          اسمك
        </label>
        <input
          id="displayName"
          name="displayName"
          required
          autoFocus
          placeholder="اكتب اسمك"
          className="rounded-lg border border-border bg-surface px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-primary text-primary-foreground font-medium py-2.5 hover:opacity-90 disabled:opacity-60 transition"
      >
        {pending ? "جارٍ الانضمام..." : "انضمام إلى العائلة"}
      </button>
    </form>
  );
}
