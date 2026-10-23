"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";

export function PasswordField() {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor="password" className="text-sm">Senha</label>
      <div className="relative mt-1.5">
        <Icon name="lock" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input id="password" name="password" type={show ? "text" : "password"} required autoComplete="current-password" placeholder="Sua senha" className="min-h-12 w-full pl-11 pr-12" />
        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Ocultar senha" : "Mostrar senha"} aria-pressed={show}
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100"><Icon name={show ? "eyeOff" : "eye"} /></button>
      </div>
    </div>
  );
}
