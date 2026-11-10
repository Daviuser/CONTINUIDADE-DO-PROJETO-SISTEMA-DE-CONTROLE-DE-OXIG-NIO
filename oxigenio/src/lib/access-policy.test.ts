import { describe, expect, it } from "vitest";
import { canAccessAppPath, canUseAction } from "./access-policy";

describe("role access policy", () => {
  it("keeps ADMIN and CONSULTA route access unchanged", () => {
    for (const role of ["ADMIN", "CONSULTA"] as const) {
      expect(canAccessAppPath(role, "/dashboard")).toBe(true);
      expect(canAccessAppPath(role, "/relatorios")).toBe(true);
    }
  });

  it("limits OPERADOR pages to Localização", () => {
    expect(canAccessAppPath("OPERADOR", "/localizacao")).toBe(true);
    expect(canAccessAppPath("OPERADOR", "/localizacao/AMBULANCIA")).toBe(true);
    for (const path of ["/dashboard", "/abastecimentos", "/trocas", "/cilindros", "/maquinas", "/fluxometros", "/relatorios", "/usuarios"]) {
      expect(canAccessAppPath("OPERADOR", path)).toBe(false);
    }
  });

  it("allows OPERADOR actions only in Localização", () => {
    expect(canUseAction("ADMIN", "general")).toBe(true);
    expect(canUseAction("ADMIN", "location")).toBe(true);
    expect(canUseAction("CONSULTA", "general")).toBe(false);
    expect(canUseAction("CONSULTA", "location")).toBe(false);
    expect(canUseAction("OPERADOR", "general")).toBe(false);
    expect(canUseAction("OPERADOR", "location")).toBe(true);
  });
});
