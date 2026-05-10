export function selectTimeline(pack, renderEvent) {
  const rule = pack.rules.find((candidate) => matchesWhen(candidate.when, renderEvent));
  if (!rule) return null;

  return pack.timelines[rule.timeline] ?? null;
}

function matchesWhen(when = {}, renderEvent) {
  return Object.entries(when).every(([section, expected]) => {
    const actual = renderEvent[section];
    if (!actual) return false;

    return Object.entries(expected).every(([key, value]) => {
      if (value === '*') return true;
      return actual[key] === value;
    });
  });
}
