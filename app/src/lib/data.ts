import raw from "@/data/app_data.json";

export const data = raw;
export type County = (typeof raw.sweden.counties)[number];
export type Source = (typeof raw.sources)[number];
export const sourceById = (id: string) => raw.sources.find((s) => s.id === id);
