import { Button } from "@/components/ui/button";
import {
  CLARITY_OPTIONS,
  CROWD_OPTIONS,
  FEEL_OPTIONS,
  SWIM_OPTIONS,
  TEMP_OPTIONS,
  WALL_OPTIONS,
  WHEN_OPTIONS,
  WHERE_OPTIONS,
  WILDLIFE_OPTIONS,
  WIND_OPTIONS,
} from "@/lib/options";

function Choice({
  name,
  legend,
  required,
  options,
}: {
  name: string;
  legend: string;
  required?: boolean;
  options: readonly { value: string; label: string; hint?: string }[];
}) {
  return (
    <fieldset className="field">
      <legend className="kicker" style={{ marginBottom: 8 }}>
        {legend}
        {required ? <span className="req">required</span> : <span className="opt">optional</span>}
      </legend>
      <div className="choice-group" role="radiogroup" aria-required={required}>
        {options.map((option) => (
          <label key={option.value} className="choice">
            <input type="radio" name={name} value={option.value} required={required} />
            <span>
              <span className="choice-label">{option.label}</span>
              {option.hint ? <span className="choice-hint">{option.hint}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ObserveForm({ filed = false, rejected = false }: { filed?: boolean; rejected?: boolean }) {
  if (filed) {
    return (
      <section className="panel">
        <p className="kicker">Filed</p>
        <h1 className="state-title" style={{ fontSize: 28 }}>
          In the pending queue
        </h1>
        <p className="blurb">
          Thank you. It will not change today&apos;s reading. A keeper has to approve it before it
          shows on the glance page. It stays in the learning pile either way.
        </p>
      </section>
    );
  }

  return (
    <form className="panel" method="post" action="/api/observations">
      <p className="kicker">Observation</p>
      <h1 className="state-title" style={{ fontSize: 28 }}>
        Leave a note
      </h1>
      <p className="blurb">
        Anonymous, structured, no photos and no free text. The required four are what calibrate the
        wall: what you saw, roughly when, where in the pool, and how it felt.
      </p>
      <Choice name="wall_state" legend="Wall state" required options={WALL_OPTIONS} />
      <Choice name="when_seen" legend="Roughly when" required options={WHEN_OPTIONS} />
      <Choice name="where_pool" legend="Where in the pool" required options={WHERE_OPTIONS} />
      <Choice name="conditions_feel" legend="Overall feel" required options={FEEL_OPTIONS} />
      <Choice name="water_temp_feel" legend="Water temperature" options={TEMP_OPTIONS} />
      <Choice name="wind_feel" legend="Wind" options={WIND_OPTIONS} />
      <Choice name="clarity" legend="Water clarity" options={CLARITY_OPTIONS} />
      <Choice name="crowd" legend="Crowd" options={CROWD_OPTIONS} />
      <Choice name="wildlife" legend="Wildlife" options={WILDLIFE_OPTIONS} />
      <Choice name="swim_again" legend="Would you swim again?" options={SWIM_OPTIONS} />
      {rejected ? (
        <p className="blurb" role="alert">
          That note did not file. Choose the four required answers from the list and try again.
        </p>
      ) : null}
      <Button type="submit">File the note</Button>
    </form>
  );
}
