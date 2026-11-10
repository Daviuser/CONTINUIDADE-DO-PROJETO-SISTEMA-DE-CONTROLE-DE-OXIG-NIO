import "server-only";
import { requireUser } from "./auth";
import { ACTION_ROLES } from "./access-policy";
// Escrita geral somente para ADMIN; Localização também permite OPERADOR. Consulta apenas lê.
export const requireWriter = () => requireUser([...ACTION_ROLES.general]);
export const requireLocationWriter = () => requireUser([...ACTION_ROLES.location]);
export const requireAdmin = () => requireUser(["ADMIN"]);
