import { timeToMinutes } from "../utils/scheduleHelpers";

interface ClassCardProps {
  classItem: any;
  color: string;
  isToday: boolean;
  startHour: number;
  PIXELS_PER_MINUTE: number
  onClick?: () => void;
}

export const ClassCard = ({ classItem, color, isToday, startHour, PIXELS_PER_MINUTE, onClick }: ClassCardProps) => {
  const startMin = timeToMinutes(classItem.startTime);
  const endMin = timeToMinutes(classItem.endTime);
  const startOffset = startMin - startHour * 60;
  const duration = endMin - startMin;
  return (
    <div
      key={`${classItem.subjectCode}-${classItem.startTime}`}
      onClick={onClick}
      className={`absolute top-0 bottom-0 rounded-md p-2 text-xs overflow-hidden shadow-sm hover:shadow-lg hover:inset-shadow-none hover:z-30 transition-all hover:scale-[1.02] cursor-pointer z-10 flex flex-col ${
        isToday && "inset-shadow-[0px_7px_10px_0px_rgba(0,0,0,0.25)]"
      }`}
      style={{
        left: `${startOffset * PIXELS_PER_MINUTE}px`,
        width: `${duration * PIXELS_PER_MINUTE}px`,
        backgroundColor: color,
      }}
      title={`${classItem.subjectName} (${classItem.startTime} - ${classItem.endTime})`}
    >
      <div className="flex justify-between h-full">
        {/* Left Column: Name & Location */}
        <div className="flex flex-col justify-between pr-1 flex-grow">
          <div className="font-bold text-gray-900 leading-tight break-words whitespace-normal">
            {classItem.subjectName}
          </div>
          <div className="font-mono bg-white/40 px-1.5 py-0.5 rounded text-[10px] backdrop-blur-sm self-start">
            {classItem.location}
          </div>
        </div>

        {/* Right Column: Time, Code, Class */}
        <div className="flex flex-col justify-between items-end text-right min-w-[40px]">
          <div className="flex flex-col text-[10px] font-medium opacity-80 leading-tight">
            <span>{classItem.startTime}</span>
            <span>{classItem.endTime}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] font-bold opacity-70 font-mono">
              {classItem.subjectCode}
            </span>
            <span className="text-[10px] font-bold opacity-70 font-mono">
              {classItem.class}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
