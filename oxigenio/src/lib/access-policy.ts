export type AppRole = "ADMIN" | "OPERADOR" | "CONSULTA";
export type ActionScope = "general" | "location";

export const ACTION_ROLES: Record<ActionScope, readonly AppRole[]> = {
  general: ["ADMIN"],
  location: ["ADMIN", "OPERADOR"],
};

export function canAccessAppPath(role: AppRole, pathname: string) {
  return role !== "OPERADOR" || pathname === "/localizacao" || pathname.startsWith("/localizacao/");
}

export function canUseAction(role: AppRole, scope: ActionScope) {
  return ACTION_ROLES[scope].includes(role);
}
