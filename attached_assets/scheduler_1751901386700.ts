import { rotateTitle } from "../services/test-analytics-api";

export const startScheduler = () => {
  console.log("[Scheduler] Started");

  setInterval(async () => {
    console.log("[Scheduler] Rotating titles...");
    try {
      await rotateTitle();
    } catch (err) {
      console.error("[Scheduler] Error rotating titles", err);
    }
  }, 5 * 60 * 1000);
};