import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const PAISES = ["GT", "MX", "CO", "AR", "US", "CR", "SV", "HN", "PA", "PE"];
const PLANES = ["premium", "basic", "free"];

async function main(): Promise<void> {
  await prisma.contact.deleteMany();
  await prisma.campaign.deleteMany();

  const contactos = Array.from({ length: 100 }, () => {
    const pais = faker.helpers.arrayElement(PAISES);
    return {
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number({ style: "international" }),
      country: pais,
      city: faker.location.city(),
      status: faker.helpers.arrayElement(["ACTIVE", "INACTIVE"] as const),
      attributes: {
        plan: faker.helpers.arrayElement(PLANES),
        age: faker.number.int({ min: 18, max: 65 }),
        last_purchase_days: faker.number.int({ min: 0, max: 180 }),
      },
    };
  });

  await prisma.contact.createMany({ data: contactos });

  await prisma.campaign.createMany({
    data: [
      {
        name: "Campaña de bienvenida",
        description: "Mensaje inicial para nuevos contactos activos",
        status: "DRAFT",
      },
      {
        name: "Promoción premium",
        description: "Oferta exclusiva para usuarios con plan premium",
        status: "ACTIVE",
      },
    ],
  });

  const total = await prisma.contact.count();
  console.log(`Seed completado: ${total} contactos creados.`);
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
