import { formatDistanceToNowStrict } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useEffect, useState } from "react";

export function TimeAgo({ minutesAgo }: { minutesAgo: number }) {
  const [label, setLabel] = useState("刚刚");

  useEffect(() => {
    const stamp = Date.now() - minutesAgo * 60_000;
    setLabel(formatDistanceToNowStrict(stamp, { locale: zhCN, addSuffix: true }));
  }, [minutesAgo]);

  return <time className="tabular-nums">{label}</time>;
}
