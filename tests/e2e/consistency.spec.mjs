// A-04: cross-member consistency, two members on two devices (Gate 1: record what happens).
// E2E-05 concurrent edits to different items both survive · E2E-06 editing a task a teammate
// just deleted is never silently lost.
import { test, expect, waitForSynced } from "./fixtures.mjs";

const open = async (page, pid) => {
  await page.goto(`/project?id=${pid}#tasks`);
  await page.waitForFunction((id) => window.Mori && Mori.state.project && Mori.state.project(id), pid);
};

test("[E2E-05] owner and collab1 change different things at the same moment: both survive", async ({ asUser, api, newProject }) => {
  const p = await newProject("owner", { members: ["collab1"] });
  const a = await asUser("owner");
  const b = await asUser("collab1", { device: "mobile" });
  await open(a, p.id);
  await open(b, p.id);
  await Promise.all([
    a.evaluate(async (pid) => { await Mori.state.addTask(pid, "From owner").saved; await Mori.workspace.change(pid, "canvas", (c) => Object.assign(c, { problem: "owner's problem" })); }, p.id),
    b.evaluate(async (pid) => { await Mori.state.addTask(pid, "From collab1").saved; await Mori.workspace.change(pid, "canvas", (c) => Object.assign(c, { solution: "collab1's solution" })); }, p.id),
  ]);
  await Promise.all([waitForSynced(a), waitForSynced(b)]);
  const { sb } = await api("owner");
  const { data: row } = await sb.from("projects").select("milestones, workspace").eq("id", p.id).single();
  expect(row.milestones.map((t) => t.text)).toEqual(expect.arrayContaining(["From owner", "From collab1"]));
  expect(row.workspace.canvas).toMatchObject({ problem: "owner's problem", solution: "collab1's solution" });
  for (const pg of [a, b]) {
    await pg.reload();
    await expect(pg.locator("body")).toContainText("From owner");
    await expect(pg.locator("body")).toContainText("From collab1");
  }
});

test("[E2E-06] collab1 edits a task the owner just deleted: the edit isn't silently lost", async ({ asUser, api, newProject }) => {
  test.fail(true, "baseline: updateTask maps over a list without the task, so the edit vanishes and nobody is told");
  const p = await newProject("owner", { members: ["collab1"] });
  const a = await asUser("owner");
  const b = await asUser("collab1");
  await open(a, p.id);
  const tid = await a.evaluate(async (pid) => { await Mori.state.addTask(pid, "Doomed task").saved; return Mori.state.project(pid).tasks.find((t) => t.text === "Doomed task").id; }, p.id);
  await open(b, p.id); // collab1 has it on screen
  await a.evaluate(async ([pid, id]) => { await Mori.state.removeTask(pid, id).saved; }, [p.id, tid]);
  const outcome = await b.evaluate(async ([pid, id]) => {
    try { await Mori.state.updateTask(pid, id, { text: "Edited after delete" }).saved; return "saved"; } catch { return "told"; }
  }, [p.id, tid]);
  await waitForSynced(b);
  // Either the member is told (a conflict), or the edit is kept somewhere they can see it.
  const told = outcome === "told" || /deleted by/i.test(await b.locator("body").innerText());
  expect(told).toBe(true);
  const { sb } = await api("owner");
  const { data: row } = await sb.from("projects").select("milestones").eq("id", p.id).single();
  expect(row.milestones.some((t) => t.id === tid)).toBe(false); // delete wins (ADR-002)
});
