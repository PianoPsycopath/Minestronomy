export function scan(fn, t0, t1, step, thr) {
  const out = [];
  let a = fn(t0);
  let b = fn(t0 + step);
  for (let x = t0 + step; x < t1; x += step) {
    const c = fn(x + step);
    if (b < a && b <= c && b < thr) out.push({ t: x, v: b });
    a = b;
    b = c;
  }
  return out;
}

// Finds local minima of several pre-sampled series at one time. This needs one calc() per sample instead of one per series.
export function minimaOf(series, t0, step, thr) {
  const out = [];
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    for (let k = 1; k < v.length - 1; k++) {
      if (v[k] < v[k - 1] && v[k] <= v[k + 1] && v[k] < (Array.isArray(thr) ? thr[i] : thr)) {
        out.push({ i, t: t0 + k * step, v: v[k] });
      }
    }
  }
  return out;
}
