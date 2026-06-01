import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const PAISES = ["GT", "MX", "CO", "AR", "US", "CR", "SV", "HN", "PA", "PE"];
const PLANES = ["premium", "basic", "free"];

async function main(): Promise<void> {
  await prisma.contact.deleteMany();
  await prisma.campaign.deleteMany();

  // ── Contactos ──────────────────────────────────────────────────────────────
  const contactos = Array.from({ length: 100 }, () => ({
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    phone: faker.phone.number({ style: "international" }),
    country: faker.helpers.arrayElement(PAISES),
    city: faker.location.city(),
    status: faker.helpers.arrayElement(["ACTIVE", "INACTIVE"] as const),
    attributes: {
      plan: faker.helpers.arrayElement(PLANES),
      age: faker.number.int({ min: 18, max: 65 }),
      last_purchase_days: faker.number.int({ min: 0, max: 180 }),
    },
  }));

  await prisma.contact.createMany({ data: contactos });

  // ── Campañas con canvas pre-configurado ────────────────────────────────────
  await prisma.campaign.create({
    data: {
      name: "Campaña de bienvenida — Guatemala",
      description:
        "Segmenta contactos activos de Guatemala y les envía un mensaje de bienvenida",
      status: "DRAFT",
      canvas: {
        nodes: [
          {
            id: "n1",
            type: "segment",
            x: 80,
            y: 120,
            config: {
              filters: {
                op: "AND",
                conditions: [
                  { field: "country", operator: "eq", value: "GT" },
                  { field: "status", operator: "eq", value: "ACTIVE" },
                ],
              },
            },
          },
          {
            id: "n2",
            type: "sms",
            x: 380,
            y: 120,
            config: {
              message:
                "¡Hola! Bienvenido a nuestra plataforma. Estamos felices de tenerte con nosotros.",
            },
          },
        ],
        edges: [{ source: "n1", target: "n2" }],
      },
    },
  });

  await prisma.campaign.create({
    data: {
      name: "Oferta premium — usuarios activos",
      description:
        "Promoción exclusiva para contactos con plan premium y más de 30 días sin comprar",
      status: "ACTIVE",
      canvas: {
        nodes: [
          {
            id: "n1",
            type: "segment",
            x: 80,
            y: 140,
            config: {
              filters: {
                op: "AND",
                conditions: [
                  { field: "status", operator: "eq", value: "ACTIVE" },
                  {
                    op: "AND",
                    conditions: [
                      {
                        field: "attributes.plan",
                        operator: "eq",
                        value: "premium",
                      },
                      {
                        field: "attributes.last_purchase_days",
                        operator: "gt",
                        value: 30,
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            id: "n2",
            type: "sms",
            x: 400,
            y: 140,
            config: {
              message:
                "¡Tenemos una oferta exclusiva para ti! Usa el código PREMIUM20 y obtén 20% de descuento.",
            },
          },
        ],
        edges: [{ source: "n1", target: "n2" }],
      },
    },
  });

  await prisma.campaign.create({
    data: {
      name: "Reactivación — usuarios inactivos jóvenes",
      description:
        "Flujo OR para reactivar contactos inactivos menores de 30 años en Latinoamérica",
      status: "DRAFT",
      canvas: {
        nodes: [
          {
            id: "n1",
            type: "segment",
            x: 80,
            y: 160,
            config: {
              filters: {
                op: "AND",
                conditions: [
                  { field: "status", operator: "eq", value: "INACTIVE" },
                  { field: "attributes.age", operator: "lt", value: 30 },
                  {
                    op: "OR",
                    conditions: [
                      { field: "country", operator: "eq", value: "GT" },
                      { field: "country", operator: "eq", value: "MX" },
                      { field: "country", operator: "eq", value: "CO" },
                    ],
                  },
                ],
              },
            },
          },
          {
            id: "n2",
            type: "sms",
            x: 400,
            y: 100,
            config: {
              message: "¡Te extrañamos! Vuelve y descubre todo lo nuevo que tenemos para ti.",
            },
          },
          {
            id: "n3",
            type: "sms",
            x: 400,
            y: 220,
            config: {
              message: "Última llamada: tu cuenta está inactiva. ¡Reactívala hoy!",
            },
          },
        ],
        edges: [
          { source: "n1", target: "n2" },
          { source: "n1", target: "n3" },
        ],
      },
    },
  });

  const totalContactos = await prisma.contact.count();
  const totalCampanias = await prisma.campaign.count();
  console.log(
    `Seed completado: ${totalContactos} contactos y ${totalCampanias} campañas creadas.`
  );
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
