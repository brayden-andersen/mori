// A-03: the multi-member project lifecycle, as real signed-in members on staging.
// E2E-03 add a collaborator · E2E-04 remove them while they have it open · E2E-09 delete the
// project while two collaborators have it open · a non-member sees nothing, by any route.
import { test, expect, waitForSynced } from "./fixtures.mjs";

const openProject = async (page, pid, tab = "tasks") => {
  await page.goto(`/project?id=${pid}#${tab}`);
  await page.waitForFunction(() => window.Mori && Mori.state && Mori.state.project);
};

test("[E2E-03] the owner adds collab1; both see the project; collab1's edits reach the owner", async ({ asUser, api, newProject }) => {
  const p = await newProject("owner");
  const owner = await asUser("owner");
  await openProject(owner, p.id, "people");
  const { id: c1 } = await api("collab1");
  await owner.evaluate(async ([pid, id]) => { await Mori.state.addCofounders(pid, [id]); }, [p.id, c1]);
  await waitForSynced(owner);

  const collab = await asUser("collab1");
  await collab.goto("/projects");
  await expect(collab.locator("body")).toContainText(p.name);
  await openProject(collab, p.id);
  await collab.evaluate(async (pid) => {
    await Mori.state.addTask(pid, "Added by collab1").saved;
    await Mori.state.updateProject(pid, { focus: "Focus set by collab1" }).saved;
  }, p.id);
  await waitForSynced(collab);

  // Gate 1: the owner sees them after a refresh (live, without one, is Gate 3).
  await owner.reload();
  await expect(owner.locator("body")).toContainText("Added by collab1");
  expect(await owner.evaluate((pid) => Mori.state.project(pid).focus, p.id)).toBe("Focus set by collab1");
});

test("[E2E-04] removed while it's open: the server keeps collab1's next edit out", async ({ asUser, api, newProject }) => {
  const p = await newProject("owner", { members: ["collab1"] });
  const collab = await asUser("collab1");
  await openProject(collab, p.id);
  const { sb } = await api("owner");
  const { id: c1 } = await api("collab1");
  await sb.from("project_members").delete().eq("project_id", p.id).eq("member_id", c1);
  await collab.evaluate((pid) => Mori.state.addTask(pid, "After removal").saved.catch(() => {}), p.id);
  await waitForSynced(collab);
  const { data: row } = await sb.from("projects").select("milestones").eq("id", p.id).single();
  expect(row.milestones.map((t) => t.text)).not.toContain("After removal");
});

test("[E2E-04] removed while it's open: collab1's save fails visibly, not as 'saved'", async ({ asUser, api, newProject }) => {
  test.fail(true, "baseline: db.changeColumn returns null for a project you can't see, and the app treats null as saved");
  const p = await newProject("owner", { members: ["collab1"] });
  const collab = await asUser("collab1");
  await openProject(collab, p.id);
  const { sb } = await api("owner");
  const { id: c1 } = await api("collab1");
  await sb.from("project_members").delete().eq("project_id", p.id).eq("member_id", c1);
  const result = await collab.evaluate(async (pid) => {
    try { await Mori.state.addTask(pid, "After removal").saved; return "saved"; } catch { return "refused"; }
  }, p.id);
  expect(result).toBe("refused");
});

test("[E2E-04] removed while it's open: collab1 is told, and cached content is no longer shown", async ({ asUser, api, newProject }) => {
  test.fail(true, "baseline: no 'access removed' state; the open tab keeps showing cached content");
  const p = await newProject("owner", { members: ["collab1"] });
  const collab = await asUser("collab1");
  await openProject(collab, p.id);
  await expect(collab.locator("body")).toContainText(p.name);
  const { sb } = await api("owner");
  const { id: c1 } = await api("collab1");
  await sb.from("project_members").delete().eq("project_id", p.id).eq("member_id", c1);
  await collab.evaluate((pid) => Mori.state.addTask(pid, "After removal").saved.catch(() => {}), p.id);
  await expect(collab.locator("body")).toContainText(/no longer (have access|on this project)/i, { timeout: 10000 });
  await expect(collab.locator("body")).not.toContainText(p.name);
});

test("[E2E-09] the owner deletes the project while two collaborators have it open", async ({ asUser, api, newProject }) => {
  test.fail(true, "baseline: open tabs aren't told; an edit afterwards is kept locally instead of refused clearly");
  const p = await newProject("owner", { members: ["collab1", "collab2"] });
  const pages = [await asUser("collab1"), await asUser("collab2")];
  for (const pg of pages) await openProject(pg, p.id);
  const { sb } = await api("owner");
  await sb.from("projects").delete().eq("id", p.id);
  for (const pg of pages) {
    const r = await pg.evaluate((pid) => Mori.workspace.change(pid, "canvas", (c) => Object.assign(c, { problem: "after delete" })).then(() => "ok", () => "refused"), p.id);
    expect(r).toBe("refused"); // no edit "succeeds" afterwards
    await expect(pg.locator("body")).toContainText(/project was deleted|isn’t available/i, { timeout: 10000 });
  }
  const { data } = await sb.from("projects").select("id").eq("id", p.id);
  expect(data).toEqual([]); // nothing recreated
});

test("[A-03] a non-member gets nothing: not through the API, not through any page", async ({ asUser, api, newProject }) => {
  const p = await newProject("owner");
  const { sb: o } = await api("owner");
  await o.from("project_docs").insert({ project_id: p.id, title: "Private", body: "<p>secret</p>" });
  const { sb } = await api("collab11"); // connected to nobody
  for (const [table, col] of [["projects", "id"], ["project_docs", "project_id"], ["project_members", "project_id"]]) {
    const { data } = await sb.from(table).select("*").eq(col, p.id);
    expect(data, table).toEqual([]);
  }
  const { data: ws } = await sb.from("projects").select("workspace, milestones").eq("id", p.id);
  expect(ws).toEqual([]);
  const page = await asUser("collab11");
  for (const tab of ["mainframe", "tasks", "docs"]) {
    await page.goto(`/project?id=${p.id}#${tab}`);
    await waitForSynced(page);
    await expect(page.locator("body")).not.toContainText(p.name);
    await expect(page.locator("body")).not.toContainText("secret");
  }
  await page.goto("/projects");
  await expect(page.locator("body")).not.toContainText(p.name);
});
