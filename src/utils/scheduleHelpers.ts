export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
};

const PALETTE = [
  "#FFBE98", // 2024 Peach Fuzz
  "#BB2649", // 2023 Viva Magenta
  "#6667AB", // 2022 Very Peri
  "#939597", // 2021 Ultimate Gray
  "#F5DF4D", // 2021 Illuminating
  "#0F4C81", // 2020 Classic Blue
  "#FF6F61", // 2019 Living Coral
  "#5F4B8B", // 2018 Ultra Violet
  "#88B04B", // 2017 Greenery
  "#F7CAC9", // 2016 Rose Quartz
  "#92A8D1", // 2016 Serenity
  "#955251", // 2015 Marsala
  "#B565A7", // 2014 Radiant Orchid
  "#009B77", // 2013 Emerald
  "#DD4124", // 2012 Tangerine Tango
  "#D65076", // 2011 Honeysuckle
  "#45B8AC", // 2010 Turquoise
  "#EFC050", // 2009 Mimosa
  "#5B5EA6", // 2008 Blue Iris
  "#9B2335", // 2007 Chili Pepper
  "#DECEBB", // 2006 Sand Dollar
  "#55B4B0", // 2005 Blue Torquoise
  "#E15D44", // 2004 Tigerlily
];

export function buildSubjectColorMap(subjectCodes: string[]): Map<string, string> {
  const uniqueSorted = Array.from(new Set(subjectCodes)).sort();
  const map = new Map<string, string>();
  uniqueSorted.forEach((code, index) => {
    map.set(code, PALETTE[index % PALETTE.length]);
  });
  return map;
}
