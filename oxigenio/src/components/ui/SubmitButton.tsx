"use client";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/Icon";

export function SubmitButton({ children, className = "btn btn-primary", pendingText = "Salvando…", icon }: {
  children: React.ReactNode; className?: string; pendingText?: string; icon?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending
        ? <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
        : icon && <Icon name={icon} className="h-4 w-4" />}
      {pending ? pendingText : children}
    </button>
  );
}
