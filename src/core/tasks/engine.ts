"use client";

import { npcById } from "@/content/npcs";
import { placeById } from "@/content/places";
import { type GameEvent, on } from "@/core/events";
import {
  addMoney,
  addReputation,
  addXp,
  getProfile,
  pushInbox,
  setFlag,
  setPinnedTask,
  setTaskProgress,
  unlockOutfit,
} from "@/core/profile";
import { setWaypoint } from "@/core/waypoint";
import { dailyKey } from "@/games/anne-maju/progress";
import { dailyTasksFor } from "@/content/tasks/daily";
import { HARI_PERTAMA } from "@/content/tasks/hari-pertama";
import { allTasks, taskById } from "./catalog";
import type { Objective, Task } from "./types";

let petsThisTask = 0;
let started = false;

function meetsRequires(task: Task) {
  const p = getProfile();
  if (task.requires?.level && p.level < task.requires.level) return false;
  if (task.requires?.tasksDone?.some((id) => !p.tasks.done.includes(id))) return false;
  if (task.requires?.flags?.some((f) => !p.flags[f])) return false;
  return true;
}

function applyRewards(task: Task) {
  const r = task.rewards;
  if (!r) return;
  if (r.money) addMoney(r.money, `Tugasan: ${task.title.ms}`, `Task: ${task.title.en}`);
  if (r.xp) addXp(r.xp);
  if (r.outfit) unlockOutfit(r.outfit);
  if (r.reputation) {
    for (const [npc, delta] of Object.entries(r.reputation)) addReputation(npc, delta);
  }
}

function currentObjective(task: Task, step: number): Objective | null {
  return task.objectives[step] ?? null;
}

function refreshWaypoint() {
  const p = getProfile();
  const active = p.tasks.active[0];
  if (!active) {
    setWaypoint(null);
    return;
  }
  const task = taskById(active.id);
  if (!task) {
    setWaypoint(null);
    return;
  }
  const obj = currentObjective(task, active.step);
  if (!obj) {
    setWaypoint(null);
    return;
  }
  if (obj.type === "goTo") {
    const place = placeById(obj.place);
    setWaypoint(place ? { x: place.x, z: place.z, label: place.label.ms } : null);
    return;
  }
  if (obj.type === "talkTo" || obj.type === "give") {
    const npc = npcById(obj.npc);
    setWaypoint(npc ? { x: npc.x, z: npc.z, label: npc.name.ms } : null);
    return;
  }
  if (obj.type === "buy") {
    const place = placeById(obj.at ?? "nasi-lemak-stall");
    setWaypoint(place ? { x: place.x, z: place.z } : null);
    return;
  }
  if (obj.type === "playJob") {
    const place = placeById(obj.job);
    setWaypoint(place ? { x: place.x, z: place.z } : null);
    return;
  }
  if (obj.type === "petCats") {
    setWaypoint(null);
    return;
  }
  if (obj.type === "sit") {
    const place = placeById(obj.place);
    setWaypoint(place ? { x: place.x, z: place.z, label: place.label.ms } : null);
    return;
  }
  setWaypoint(null);
}

function completeTask(task: Task) {
  const p = getProfile();
  const active = p.tasks.active.filter((a) => a.id !== task.id);
  const done = p.tasks.done.includes(task.id) ? p.tasks.done : [...p.tasks.done, task.id];
  setTaskProgress(active, done);
  if (p.pinnedTask === task.id) setPinnedTask(active[0]?.id ?? null);
  applyRewards(task);
  petsThisTask = 0;
  offerNextStory();
  refreshWaypoint();
}

function advance(taskId: string) {
  const p = getProfile();
  const prog = p.tasks.active.find((a) => a.id === taskId);
  const task = taskById(taskId);
  if (!prog || !task) return;
  const nextStep = prog.step + 1;
  if (nextStep >= task.objectives.length) {
    completeTask(task);
    return;
  }
  setTaskProgress(
    p.tasks.active.map((a) => (a.id === taskId ? { ...a, step: nextStep } : a)),
    p.tasks.done,
  );
  if (task.objectives[nextStep]?.type === "petCats") petsThisTask = 0;
  refreshWaypoint();
}

function objectiveMet(obj: Objective, event: GameEvent) {
  switch (obj.type) {
    case "goTo":
      return event.type === "entered" && event.place === obj.place;
    case "talkTo":
      return event.type === "talked" && event.npc === obj.npc && (!obj.dialogue || event.dialogue === obj.dialogue || getProfile().flags[`talked:${obj.dialogue}`]);
    case "playJob":
      return (
        event.type === "jobFinished" &&
        event.job === obj.job &&
        (obj.minEarned === undefined || event.earned >= obj.minEarned) &&
        (obj.minServed === undefined || event.served >= obj.minServed) &&
        (!obj.mode || event.mode === obj.mode)
      );
    case "petCats": {
      if (event.type !== "catPetted") return false;
      if (obj.catId && event.id !== obj.catId) return false;
      petsThisTask += 1;
      return petsThisTask >= obj.count;
    }
    case "buy":
      return event.type === "bought" && event.item === obj.item;
    case "give":
      return event.type === "gave" && event.item === obj.item && event.npc === obj.npc;
    case "sit":
      return event.type === "sat" && event.place === obj.place;
    default:
      return false;
  }
}

function onEvent(event: GameEvent) {
  const p = getProfile();
  for (const prog of p.tasks.active) {
    const task = taskById(prog.id);
    if (!task) continue;
    const obj = currentObjective(task, prog.step);
    if (!obj) continue;
    if (objectiveMet(obj, event)) {
      advance(prog.id);
      break;
    }
  }
  // Soft place enter for goTo even before accept? no — only active tasks
  refreshWaypoint();
}

export function acceptTask(taskId: string, opts?: { pin?: boolean }) {
  const task = taskById(taskId);
  if (!task || !meetsRequires(task)) return false;
  const p = getProfile();
  // Daily/weekly can be re-offered under a new id; one-shot story tasks stay done
  if (p.tasks.done.includes(taskId) && !task.repeat) return false;
  if (p.tasks.active.some((a) => a.id === taskId)) {
    if (opts?.pin !== false) setPinnedTask(taskId);
    refreshWaypoint();
    return true;
  }
  setTaskProgress([...p.tasks.active, { id: taskId, step: 0 }], p.tasks.done);
  // Pin so waypoint matches the task you just took (inbox Accept)
  if (opts?.pin !== false) setPinnedTask(taskId);
  petsThisTask = 0;
  refreshWaypoint();
  return true;
}

function offerTaskMessage(task: Task) {
  const p = getProfile();
  if (p.inbox.some((m) => m.taskId === task.id)) return;
  if (p.tasks.done.includes(task.id) || p.tasks.active.some((a) => a.id === task.id)) return;
  pushInbox({
    from: task.giver,
    bodyMs: task.intro.ms,
    bodyEn: task.intro.en,
    taskId: task.id,
  });
}

export function offerNextStory() {
  const p = getProfile();
  for (const task of HARI_PERTAMA) {
    if (p.tasks.done.includes(task.id) || p.tasks.active.some((a) => a.id === task.id)) continue;
    if (!meetsRequires(task)) continue;
    offerTaskMessage(task);
    return;
  }
}

export function offerDailyIfNeeded() {
  const day = dailyKey();
  const flag = `daily-offered:${day}`;
  if (getProfile().flags[flag]) return;
  setFlag(flag, true);
  const p = getProfile();
  for (const task of dailyTasksFor()) {
    if (p.tasks.done.includes(task.id)) continue;
    if (p.tasks.active.some((a) => a.id === task.id)) continue;
    if (p.inbox.some((m) => m.taskId === task.id)) continue;
    pushInbox({
      from: task.giver,
      bodyMs: task.intro.ms,
      bodyEn: task.intro.en,
      taskId: task.id,
    });
  }
}

export function kickoffStory() {
  if (started) return;
  started = true;
  offerNextStory();
  offerDailyIfNeeded();
  refreshWaypoint();
}

export function startTaskEngine() {
  kickoffStory();
  return on(onEvent);
}

export function activeTaskSummary() {
  const p = getProfile();
  const id = p.pinnedTask ?? p.tasks.active[0]?.id;
  if (!id) return null;
  const prog = p.tasks.active.find((a) => a.id === id);
  const task = taskById(id);
  if (!prog || !task) return null;
  return { task, step: prog.step, objective: currentObjective(task, prog.step) };
}

// silence unused in tree-shaking edge cases
void allTasks;
