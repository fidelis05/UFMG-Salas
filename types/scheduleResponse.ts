import type ClassItem from "./classItem";

export default interface ScheduleResponse {
  semester: string;
  initialDate: string;
  finalDate: string;
  earliestTime: string;
  latestTime: string;
  schedule: { [day: string]: ClassItem[] }[];
}