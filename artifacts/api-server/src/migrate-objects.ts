import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const MIGRATION_NAME = "sync_objects_v1";

const UPDATES = [
  { id: 1,  name: "Д. Новая",                         code: "5114", status: "active", manager: "Зайцев Денис" },
  { id: 2,  name: "Знаменское",                        code: "3737", status: "closed", manager: "" },
  { id: 3,  name: "Новоалексеевская",                  code: "5223", status: "closed", manager: "" },
  { id: 4,  name: "Ленинградка 58",                    code: "5132", status: "closed", manager: "" },
  { id: 5,  name: "Лихачева 18к5",                     code: "-",    status: "closed", manager: "" },
  { id: 6,  name: "Прайм парк. Оконечное оборудование",code: "5351", status: "closed", manager: "" },
  { id: 7,  name: "Полянка 44. Лотос",                 code: "5147", status: "closed", manager: "" },
  { id: 8,  name: "ЖК Золотой",                        code: "5357", status: "closed", manager: "" },
  { id: 9,  name: "Вятская 41 А",                      code: "5338", status: "closed", manager: "" },
  { id: 10, name: "Офис",                              code: "-",    status: "regular", manager: "" },
  { id: 11, name: "Склад",                             code: "-",    status: "regular", manager: "" },
  { id: 12, name: "Ривьера",                           code: "5134", status: "closed", manager: "" },
  { id: 13, name: "Лихачёва  18к5",                    code: "-",    status: "active", manager: "Устименко Илья" },
  { id: 15, name: "Прайм парк (Черновые)",             code: "5346", status: "closed", manager: "" },
  { id: 21, name: "Музей казачества",                  code: "5289", status: "closed", manager: "" },
  { id: 23, name: "Поляны Фасад. Светильники",         code: "5203", status: "active", manager: "Шкунов Олег" },
  { id: 26, name: "Новоалексеевская Оконечка",         code: "5323", status: "active", manager: "Зайцев Денис" },
  { id: 28, name: "Кутузовский проспект 4/2",          code: "5383", status: "closed", manager: "Черных Вадим" },
  { id: 31, name: "Просвещение",                       code: "4172", status: "closed", manager: "" },
  { id: 34, name: "Москва",                            code: "5408", status: "closed", manager: "" },
  { id: 35, name: "Рекламация",                        code: "-",    status: "regular", manager: "" },
  { id: 36, name: "Вишнёвый сад",                      code: "5146", status: "closed", manager: "" },
  { id: 37, name: "Ладо",                              code: "5444", status: "active", manager: "Давыдов Владимир" },
  { id: 38, name: "Мневники 9",                        code: "5428", status: "active", manager: "Носов Дмитрий" },
  { id: 40, name: "Поляны Фасад. Монтаж кабеля",      code: "5202", status: "closed", manager: "" },
  { id: 45, name: "Мытищи",                            code: "-",    status: "closed", manager: "" },
  { id: 46, name: "Красносельская 19с2",               code: "-",    status: "active", manager: "Носов Дмитрий" },
];

const INSERT = { id: 47, name: "Завидово", code: "2471", status: "active", manager: "Русин Денис" };

export async function migrateObjects(logger: { info: (msg: string) => void; error: (obj: unknown, msg: string) => void }) {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const result = await db.execute(sql`SELECT name FROM _migrations WHERE name = ${MIGRATION_NAME}`);
    if (result.rows.length > 0) {
      logger.info(`Migration ${MIGRATION_NAME} already applied, skipping`);
      return;
    }

    logger.info(`Applying migration ${MIGRATION_NAME}...`);

    for (const u of UPDATES) {
      await db.execute(sql`
        UPDATE work_objects
        SET name = ${u.name}, code = ${u.code}, status = ${u.status}, manager = ${u.manager}
        WHERE id = ${u.id}
      `);
    }

    await db.execute(sql`
      INSERT INTO work_objects (id, name, code, status, manager, category)
      VALUES (${INSERT.id}, ${INSERT.name}, ${INSERT.code}, ${INSERT.status}, ${INSERT.manager}, 'standard')
      ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name, code = EXCLUDED.code,
            status = EXCLUDED.status, manager = EXCLUDED.manager
    `);

    await db.execute(sql`INSERT INTO _migrations (name) VALUES (${MIGRATION_NAME})`);
    logger.info(`Migration ${MIGRATION_NAME} applied successfully`);
  } catch (err) {
    logger.error(err, `Migration ${MIGRATION_NAME} failed`);
  }
}
