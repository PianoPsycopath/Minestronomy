export function parseTintColor(colorArr, fallback = [1, 1, 1]) {
  if (!Array.isArray(colorArr) || colorArr.length < 3) return fallback;
  return [
    Number.isFinite(+colorArr[0]) ? +colorArr[0] : fallback[0],
    Number.isFinite(+colorArr[1]) ? +colorArr[1] : fallback[1],
    Number.isFinite(+colorArr[2]) ? +colorArr[2] : fallback[2]
  ];
}
