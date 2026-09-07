import cron from "node-cron";
import { updateBonds } from "./updateBonds.ts";

export function startBondsCron() {
  console.log("⏳ Первичное обновление облигаций...");
  updateBonds().catch(console.error);
  cron.schedule("0 3 * * *", async () => {
    console.log("⏳ Обновление облигаций...");
    await updateBonds();
  });
}
