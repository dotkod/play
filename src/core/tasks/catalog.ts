import { HARI_PERTAMA } from "@/content/tasks/hari-pertama";
import { dailyTasksFor, resolveDailyTask } from "@/content/tasks/daily";
import type { Task } from "./types";

export function allTasks(): Task[] {
  return [...HARI_PERTAMA, ...dailyTasksFor()];
}

export function taskById(id: string): Task | null {
  return HARI_PERTAMA.find((t) => t.id === id) ?? resolveDailyTask(id);
}

export function storyTasks() {
  return HARI_PERTAMA;
}
