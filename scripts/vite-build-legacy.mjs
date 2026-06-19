import { createBuilder } from "vite";

async function main() {
  const builder = await createBuilder({ root: process.cwd() }, true);
  await builder.buildApp();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});