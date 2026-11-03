import { useEffect, useState } from 'react';

/** Текущее время, обновляется раз в минуту — слоты «в прошлом» гаснут сами. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
