"use client";

import { useActionState, type ReactNode } from "react";

export type MemberActionState = { error?: string; success?: string };
export type MemberAction = (
  previous: MemberActionState,
  formData: FormData,
) => Promise<MemberActionState>;

export function MemberActionForm({
  action,
  children,
  label,
  pendingLabel = "Saving…",
  tone = "primary",
  className = "stack",
}: {
  action: MemberAction;
  children?: ReactNode;
  label: string;
  pendingLabel?: string;
  tone?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && <p className="notice notice-error" role="alert">{state.error}</p>}
      {state.success && <p className="notice notice-success" role="status">{state.success}</p>}
      <div>
        <button
          type="submit"
          className={`button${tone === "primary" ? "" : ` button-${tone}`}`}
          disabled={pending}
          aria-disabled={pending}
        >
          {pending ? pendingLabel : label}
        </button>
      </div>
    </form>
  );
}
