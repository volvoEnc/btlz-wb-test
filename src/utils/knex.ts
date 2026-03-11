import { migrate, seed } from "#postgres/knex.js";
import { Command } from "commander";

/**
 * CLI-обёртка над knex migrate/seed командами.
 */
const program = new Command();

/**
 * Регистрирует migrate-команды CLI.
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
/**
 * Регистрирует seed-команды CLI.
 */
program.command("seed [action] [arg]").action(async (action, arg) => {
    if (!action) return;
    if (action === "run") await seed.run();
    if (action === "make") await seed.make(arg);
    process.exit(0);
});

/**
 * Регистрирует пустую команду по умолчанию.
 */
program.command("default", { isDefault: true }).action(() => {});

/**
 * Запускает разбор аргументов CLI.
 */
program.parse();
