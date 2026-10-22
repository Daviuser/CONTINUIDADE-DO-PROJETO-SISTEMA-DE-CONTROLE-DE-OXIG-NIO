import "server-only";
import { requireUser } from "./auth";
// Escrita: Administrador e Operador. Consulta apenas lê. Chamar no INÍCIO de toda ação de servidor.
export const requireWriter = () => requireUser(["ADMIN", "OPERADOR"]);
export const requireAdmin = () => requireUser(["ADMIN"]);
