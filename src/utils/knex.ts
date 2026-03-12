import { migrate, seed } from "#postgres/knex.js";
import { Command } from "commander";

/**
 * CLI для migrate/seed.
 */
const program = new Command();

/**
 * Команды migrate.
 */
program
    .command("migrate")
    .argument("[type]", "latest|rollback|status|down|up|list")
    .argument("[arg]", "version")
    .action(async (action, arg) => {
        if (!action) return;
        if (action === "latest") await migrate.latest();
        if (action === "rollback") await migrate.rollback();
        if (action === "down") await migrate.down(arg);
        if (action === "up") await migrate.up(arg);
        if (action === "list") await migrate.list();
        if (action === "make") await migrate.make(arg);
        process.exit(0);
    });
/** Команды seed. */
program.command("seed [action] [arg]").action(async (action, arg) => {
    if (!action) return;
    if (action === "run") await seed.run();
    if (action === "make") await seed.make(arg);
    process.exit(0);
});

/**
 * Пустая команда по умолчанию.
 */
program.command("default", { isDefault: true }).action(() => {});

/**
 * Запускает CLI.
 */
program.parse();
