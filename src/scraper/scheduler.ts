/**
 * 爬虫调度器（当前无调用点 —— 保留备用）
 *
 * ⚠️ startScheduler / stopScheduler / getSchedulerStatus 在整个项目里
 * 没有任何地方 import，所以"每天早上 8 点自动爬取"目前并不存在，
 * 设置页也没有对应开关。
 *
 * 另外注意：orchestrator 的 SCRAPERS 数组是空的（见那边注释），
 * 即使接上调度器也爬不到任何东西。要启用请先注册爬虫源。
 */

import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import { runAllScrapers } from "./orchestrator";

let scheduledTask: ScheduledTask | null = null;
let lastRunTime: Date | null = null;
let isRunning = false;

/**
 * 获取调度器状态
 */
export function getSchedulerStatus() {
  return {
    isRunning,
    lastRunTime,
    isScheduled: scheduledTask !== null,
    cronExpression: scheduledTask ? "0 8 * * *" : null, // 每天早上 8 点
  };
}

/**
 * 启动定时调度（默认每天早上 8 点执行）
 */
export function startScheduler(cronExpression = "0 8 * * *") {
  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(cronExpression, async () => {
    console.log(`[Scheduler] Cron 触发: ${new Date().toISOString()}`);
    await executeScrape();
  });

  console.log(`[Scheduler] 已启动: ${cronExpression}`);
}

/**
 * 停止定时调度
 */
export function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
  console.log("[Scheduler] 已停止");
}

/**
 * 手动触发一次爬取
 */
export async function executeScrape() {
  if (isRunning) {
    throw new Error("爬取正在进行中，请等待完成");
  }

  isRunning = true;
  try {
    const report = await runAllScrapers();
    lastRunTime = new Date();
    return report;
  } finally {
    isRunning = false;
  }
}
