import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shell } from "@/components/shell";
import { adminCookieName, sessionIsValid, usingDevPassword } from "@/lib/auth";
import { listObservations, readSettings, type ObservationRow } from "@/lib/db";
import {
  CLARITY_OPTIONS,
  CROWD_OPTIONS,
  FEEL_OPTIONS,
  labelOf,
  SWIM_OPTIONS,
  TEMP_OPTIONS,
  WALL_OPTIONS,
  WHEN_OPTIONS,
  WHERE_OPTIONS,
  WILDLIFE_OPTIONS,
  WIND_OPTIONS,
} from "@/lib/options";
import { formatLondonStamp } from "@/lib/time";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Keeper's desk",
  robots: { index: false, follow: false },
};

function NoteCard({ row }: { row: ObservationRow }) {
  return (
    <article className="row-card">
      <p className="mono">
        #{row.id} · {row.status}
        {row.is_seed ? <span className="tag">demo plate</span> : null}
      </p>
      <p className="mono">
        {labelOf(WALL_OPTIONS, row.wall_state)} · {labelOf(WHEN_OPTIONS, row.when_seen)} ·{" "}
        {labelOf(WHERE_OPTIONS, row.where_pool)}
      </p>
      <p className="mono">{labelOf(FEEL_OPTIONS, row.conditions_feel)}</p>
      <p className="fine">
        {[
          labelOf(TEMP_OPTIONS, row.water_temp_feel),
          labelOf(WIND_OPTIONS, row.wind_feel),
          labelOf(CLARITY_OPTIONS, row.clarity),
          labelOf(CROWD_OPTIONS, row.crowd),
          labelOf(WILDLIFE_OPTIONS, row.wildlife),
          labelOf(SWIM_OPTIONS, row.swim_again),
        ]
          .filter(Boolean)
          .join(" · ") || "No optional answers."}
      </p>
      <p className="fine">
        Filed {formatLondonStamp(new Date(row.created_at))}
        {row.predicted_state
          ? ` · forecast then was ${row.predicted_state} at ${row.predicted_height_m ?? "?"} m`
          : ""}
      </p>
      {row.status === "pending" ? (
        <div className="desk-actions">
          <form action={`/api/admin/observations/${row.id}`} method="post">
            <input type="hidden" name="decision" value="approved" />
            <Button type="submit">Approve</Button>
          </form>
          <form action={`/api/admin/observations/${row.id}`} method="post">
            <input type="hidden" name="decision" value="rejected" />
            <Button type="submit" variant="outline">
              Reject
            </Button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const jar = await cookies();
  const authed = sessionIsValid(jar.get(adminCookieName())?.value);

  if (!authed) {
    return (
      <Shell active="admin">
        <section className="panel">
          <p className="kicker">Keeper&apos;s desk</p>
          <h1 className="state-title" style={{ fontSize: 32 }}>
            Locked
          </h1>
          <p className="blurb">
            Password from the <span className="mono">ADMIN_PASSWORD</span> environment variable.
            {usingDevPassword()
              ? " On this dev machine, until you set one, the password is walpole-dip."
              : ""}
          </p>
          {params.error === "1" ? (
            <p className="blurb" role="alert">
              That password did not fit.
            </p>
          ) : null}
          {params.error === "unset" ? (
            <p className="blurb" role="alert">
              Set ADMIN_PASSWORD before this desk will open in production.
            </p>
          ) : null}
          <form action="/api/admin/login" method="post" className="field">
            <label className="kicker" htmlFor="password">
              Password
            </label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
            <div style={{ marginTop: 12 }}>
              <Button type="submit">Open the desk</Button>
            </div>
          </form>
        </section>
      </Shell>
    );
  }

  const settings = readSettings();
  const pending = listObservations("pending");
  const approved = listObservations("approved").slice(0, 12);
  const rejected = listObservations("rejected").slice(0, 8);

  return (
    <Shell active="admin">
      <div className="desk">
        <section className="panel">
          <p className="kicker">Keeper&apos;s desk</p>
          <h1 className="state-title" style={{ fontSize: 32 }}>
            {pending.length} waiting
          </h1>
          <p className="blurb">
            Approving a note puts it on the glance page. It does not change the tide curve or the
            wall numbers. Those stay as you set them below.
          </p>
          <div className="desk-actions">
            <a className="mono" href="/api/admin/export">
              Download the spreadsheet (CSV)
            </a>
            <form action="/api/admin/logout" method="post">
              <Button type="submit" variant="outline">
                Lock the desk
              </Button>
            </form>
          </div>
        </section>

        <section className="panel">
          <h2>Pending</h2>
          {pending.length === 0 ? <p className="fine">Nothing waiting.</p> : pending.map((row) => <NoteCard key={row.id} row={row} />)}
        </section>

        <section className="panel">
          <h2>Wall numbers · metres Chart Datum</h2>
          <p className="fine">
            Seeded placeholders, not a survey. Overflow must sit below the wall top. Wave allowance
            is a stub added to the predicted tide before the comparison. It is not a wave model.
          </p>
          {params.error === "settings" ? (
            <p className="blurb" role="alert">
              Those numbers were not saved. Overflow has to be below the wall top, and the bands
              have to be in range.
            </p>
          ) : null}
          <form action="/api/admin/settings" method="post" className="settings-grid">
            <label className="field">
              <span className="kicker">Wall top</span>
              <Input name="wallTopMetresCD" type="number" step="0.01" min="0" max="12" defaultValue={settings.wallTopMetresCD} required />
            </label>
            <label className="field">
              <span className="kicker">Overflow</span>
              <Input name="overflowMetresCD" type="number" step="0.01" min="0" max="12" defaultValue={settings.overflowMetresCD} required />
            </label>
            <label className="field">
              <span className="kicker">Approach band</span>
              <Input name="approachBandMetres" type="number" step="0.01" min="0" max="2" defaultValue={settings.approachBandMetres} required />
            </label>
            <label className="field">
              <span className="kicker">Waterfall window, minutes</span>
              <Input name="waterfallWindowMinutes" type="number" step="1" min="5" max="60" defaultValue={settings.waterfallWindowMinutes} required />
            </label>
            <label className="field">
              <span className="kicker">Wave allowance stub</span>
              <Input name="waveAllowanceMetres" type="number" step="0.01" min="0" max="2" defaultValue={settings.waveAllowanceMetres} required />
            </label>
            <fieldset className="field" style={{ gridColumn: "1 / -1" }}>
              <legend className="kicker">Pollution banner</legend>
              <div className="choice-group">
                <label className="choice">
                  <input type="radio" name="pollutionOverride" value="auto" defaultChecked={settings.pollutionOverride === "auto"} />
                  <span className="choice-label">Follow Southern Water</span>
                </label>
                <label className="choice">
                  <input type="radio" name="pollutionOverride" value="force_warning" defaultChecked={settings.pollutionOverride === "force_warning"} />
                  <span className="choice-label">Force a warning on</span>
                </label>
                <label className="choice">
                  <input type="radio" name="pollutionOverride" value="suppress_warning" defaultChecked={settings.pollutionOverride === "suppress_warning"} />
                  <span className="choice-label">Suppress the automatic banner</span>
                </label>
              </div>
            </fieldset>
            <div>
              <Button type="submit">Save the numbers</Button>
            </div>
          </form>
        </section>

        <section className="panel">
          <h2>Approved, recent</h2>
          {approved.map((row) => <NoteCard key={row.id} row={row} />)}
        </section>
        <section className="panel">
          <h2>Rejected</h2>
          {rejected.length === 0 ? <p className="fine">None rejected.</p> : rejected.map((row) => <NoteCard key={row.id} row={row} />)}
        </section>
      </div>
    </Shell>
  );
}
