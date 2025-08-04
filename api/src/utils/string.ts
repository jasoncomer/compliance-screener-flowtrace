export const padZero = (num: number, size: number): string => {
  let s = `${num}`;
  while (s.length < size) s = `0${s}`;
  return s;
};
