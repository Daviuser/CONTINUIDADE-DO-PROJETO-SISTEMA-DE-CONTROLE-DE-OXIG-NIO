import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
const db = new PrismaClient();
async function main() {
  for (const [code, name] of [["HOSPITAL","Hospital"],["DOMICILIO","Domicílio"],["TRANSPORTE","Em transporte/troca"]])
    await db.location.upsert({ where:{code}, update:{}, create:{code,name} });
  for (const [size,label] of [["P","Pequeno (P)"],["M","Médio (M)"],["G","Grande (G)"]] as const)
    await db.cylinderType.upsert({ where:{size}, update:{}, create:{size,label} });
  const email = process.env.SEED_ADMIN_EMAIL, pw = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !pw) throw new Error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD");
  await db.user.upsert({ where:{email}, update:{}, create:{
    email, name:"Administrador", role:"ADMIN", passwordHash: await hash(pw) }});
  console.log("Seed concluído (sem dados fictícios de estoque ou pacientes).");
}
main().finally(()=>db.$disconnect());
