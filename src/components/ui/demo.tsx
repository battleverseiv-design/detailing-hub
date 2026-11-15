"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";

const today = new Date();

export function CalendarPreview() {
  const [selected, setSelected] = React.useState<Date | undefined>(today);
  return (
    <div className="flex flex-col items-center justify-center p-6 gap-4">
      <Calendar selected={selected} onSelect={setSelected} locale="ru" />
    </div>
  );
}

export default function Demo() {
  return <CalendarPreview />;
}
