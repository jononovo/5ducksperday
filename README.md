export const newTable = pgTable("table_name", {
       id: serial("id").primaryKey(),
       field: text("field").notNull()
     });