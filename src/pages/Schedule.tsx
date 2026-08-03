import { useEffect, useMemo, useState } from "react";
import getSchedule from "../services/schedule";
import type ScheduleResponse from "../../types/scheduleResponse";
import { ClassCard } from "../components/ClassCard";
import { ClassDetail, type SelectedClass } from "../components/ClassDetail";
import { buildSubjectColorMap } from "../utils/scheduleHelpers";

const FALLBACK_COLOR = "#D1D5DB"; // gray-300

const weekDays = ["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];
const PIXELS_PER_MINUTE = 1.9;

const Schedule = () => {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [selected, setSelected] = useState<SelectedClass | null>(null);

  const skeletonCards = useMemo(() => {
    const windowStart = Math.floor(Math.random() * (20 - 7)) + 7;
    return weekDays.map(() => {
      const offsetMinutes = Math.floor(Math.random() * 130);
      return windowStart + offsetMinutes / 60;
    });
  }, []);

  const subjectColorMap = useMemo(() => {
    const subjectCodes = (data?.schedule ?? []).flatMap((dayObj) =>
      Object.values(dayObj).flatMap((classes: any) =>
        classes.map((c: any) => c.subjectCode)
      )
    );
    return buildSubjectColorMap(subjectCodes);
  }, [data]);

  const loadData = async (force: boolean = false) => {
    setLoading(true);
    setStatus("Iniciando...");
    try {
      const response = await getSchedule({ forceReload: force }, (s) => {
        if (s === "FETCHING_FROM_UNIVERSITY")
          setStatus("Buscando dados na UFMG...");
        if (s === "PROCESSING_ROOMS") setStatus("Processando salas...");
      });
      setData(response);
    } catch (error: any) {
      console.error(error);
      if (error?.message === "MISSING_TOKEN") {
        window.location.href = "/login";
        return;
      }
      if (error?.message?.includes("SESSION_EXPIRED")) {
        await fetch("/api/logout");
        window.location.href = "/login?expired=true";
        return;
      }
      setStatus("Erro ao carregar");
    } finally {
      setLoading(false);
      setStatus("");
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const startHour = data?.earliestTime
    ? parseInt(data.earliestTime.split(":")[0])
    : 7;
  const endHour = data?.latestTime
    ? parseInt(data.latestTime.split(":")[0]) + 1
    : 23;

  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i,
  );

  const totalMinutes = (endHour - startHour) * 60;
  const timelineWidth = totalMinutes * PIXELS_PER_MINUTE;

  const todayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday, ...
  const todayDayName = todayIndex > 0 ? weekDays[todayIndex - 1] : "";

  return (
    <div className="relative flex h-fit">
      <div className="flex-1 min-w-0 flex justify-between">
        <div className="flex-1 min-w-0 h-full bg-[#F8F8F8] py-4 pr-0">
          <div className="w-full h-full overflow-x-scroll overflow-y-hidden pr-8">
            <div className="min-w-fit relative">
              {/* Header with Hours */}
              <div className="flex h-6 sticky top-0 z-30">
                <div className="w-[4.5rem] flex-shrink-0 sticky left-0 z-40 "></div>
                <div
                  className="relative flex-grow"
                  style={{ width: `${timelineWidth}px` }}
                >
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 flex items-center justify-center text-xs font-semibold text-gray-500 -translate-x-1/2 last:px-3"
                      style={{
                        left: `${(h - startHour) * 60 * PIXELS_PER_MINUTE}px`,
                      }}
                    >
                      {h}:00
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule Body */}
              <div className="relative">
                {/* Vertical Grid Lines (Background) */}
                <div className="absolute inset-0 ml-[4.5rem] h-[140%] -translate-y-2 pointer-events-none z-0">
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 border-l border-1 border-gray-300 border-dashed"
                      style={{
                        left: `${(h - startHour) * 60 * PIXELS_PER_MINUTE}px`,
                      }}
                    />
                  ))}
                </div>

                {/* Days Rows */}
                {weekDays.map((day, index) => {
                  const daySchedule =
                    data?.schedule?.find((dayObj) => dayObj[day])?.[day] || [];

                  const isToday = day === todayDayName;

                  return (
                    <div
                      key={day}
                      className={`flex h-26 relative group mt-2 after:border-b after:w-[100%] after:h-0 after:border-neutral-200 after:-bottom-1 after:absolute  ${
                        isToday
                          ? "bg-[#D44A61] inset-shadow-[0_7px_10px_0_rgba(0,0,0,0.25)]"
                          : ""
                      }`}
                    >
                      {/* Today indicator */}
                      <div className="w-8 flex-shrink-0 sticky left-0 z-20 flex items-center justify-center bg-[#F8F8F8]">
                        {isToday && (
                          <span className="text-sm text-[#D44A61] font-bold -rotate-90 whitespace-nowrap">
                            HOJE
                          </span>
                        )}
                      </div>

                      {/* Day Label */}
                      <div
                        className={`w-10 flex-shrink-0 sticky left-8 z-20 flex flex-col items-center justify-center font-bold text-sm shadow-[10px_10px_10px_0px_rgba(0,0,0,0.05)] before:absolute before:h-2 before:shadow-[10px_10px_10px_0px_rgba(0,0,0,0.05)] before:bg-[#F8F8F8] before:-bottom-2 before:-left-10 before:w-20 ${
                          isToday
                            ? "bg-[#D44A61] text-white shadow-none inset-shadow-[10px_7px_10px_0px_rgba(0,0,0,0.3)]"
                            : "bg-[#F8F8F8] text-gray-700"
                        }`}
                      >
                        <span className="-rotate-90">{day}</span>
                      </div>

                      {/* Cards Container */}
                      <div className="relative flex-grow h-full">
                        {!data ? (
                          <div
                            className="absolute top-1 bottom-1 rounded-md bg-gray-200 animate-pulse z-10"
                            style={{
                              left: `${
                                (skeletonCards[index] - startHour) *
                                60 *
                                PIXELS_PER_MINUTE
                              }px`,
                              width: `${50 * PIXELS_PER_MINUTE}px`,
                            }}
                          />
                        ) : (
                          daySchedule.map((classItem: any) => {
                            return (
                              <ClassCard
                                key={`${classItem.subjectCode}-${classItem.startTime}`}
                                classItem={classItem}
                                color={
                                  subjectColorMap.get(classItem.subjectCode) ??
                                  FALLBACK_COLOR
                                }
                                isToday={isToday}
                                startHour={startHour}
                                PIXELS_PER_MINUTE={PIXELS_PER_MINUTE}
                                onClick={() =>
                                  setSelected({ item: classItem, day })
                                }
                              />
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={loading}
            className={`fixed bottom-20 md:bottom-4 right-4 ${
              selected ? "md:right-[21rem]" : ""
            } bg-[#D44A61] text-white px-4 py-2 rounded-full shadow-lg hover:bg-[#b93d52] disabled:bg-gray-400 transition-all duration-300 z-50 font-semibold text-sm`}
          >
            {loading ? status || "Atualizando..." : "Atualizar Grade"}
          </button>
        </div>
      </div>
      <ClassDetail selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default Schedule;
