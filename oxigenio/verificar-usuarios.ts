
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const usuarios = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      active: true,
    },
  });

  console.table(usuarios);
}

main()
  .catch((error) => {
    console.error("Erro ao consultar usuários:");
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
