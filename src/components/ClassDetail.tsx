import { useEffect, useState } from "react";
import type ClassItem from "../../types/classItem";

export interface SelectedClass {
  item: ClassItem;
  day: string;
}

interface ClassDetailProps {
  selected: SelectedClass | null;
  onClose: () => void;
}

function DetailBody({
  selected,
  onClose,
}: {
  selected: SelectedClass;
  onClose: () => void;
}) {
  const { item, day } = selected;
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-block bg-[#D44A61]/10 text-[#D44A61] text-xs font-bold px-2 py-1 rounded mb-2">
            {item.subjectCode || "S/C"} · Turma {item.class}
          </span>
          <h3 className="text-lg font-bold text-gray-900 leading-snug">
            {item.subjectName}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Dia" value={day} />
        <DetailField
          label="Horário"
          value={`${item.startTime} - ${item.endTime}`}
        />
        <DetailField label="Duração" value={`${item.duration} min`} />
        <DetailField label="Local" value={item.location || "Não encontrada"} />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-1 border-t border-gray-100">
        <DetailField label="Nível" value={item.level} />
        <DetailField label="Carga Horária" value={`${item.workload}h`} />
        <DetailField label="Tipo" value={item.classType} />
        <DetailField label="Departamento" value={item.department} />
      </div>

      <DetailField
        label="Professor(es)"
        value={item.professor.filter(Boolean).join(", ") || "Não informado"}
      />

      {item.description && (
        <DetailField label="Ementa" value={item.description} multiline />
      )}
    </div>
  );
}

function DetailField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={`text-sm text-gray-800 ${
          multiline ? "whitespace-pre-line" : "font-medium"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function ClassDetail({ selected, onClose }: ClassDetailProps) {
  const open = selected !== null;
  const [displayed, setDisplayed] = useState<SelectedClass | null>(selected);

  useEffect(() => {
    if (selected) {
      setDisplayed(selected);
      return;
    }
    const timeout = setTimeout(() => setDisplayed(null), 300);
    return () => clearTimeout(timeout);
  }, [selected]);

  return (
    <>
      {/* Desktop: slides in from the right, resizing the schedule view */}
      <div
        className={`hidden md:block h-dvh flex-shrink-0 bg-white border-l border-gray-200 overflow-hidden transition-[width] duration-300 ease-in-out ${
          open ? "w-80" : "w-0"
        }`}
      >
        <div className="w-80 h-full overflow-y-auto p-6">
          {displayed && <DetailBody selected={displayed} onClose={onClose} />}
        </div>
      </div>

      {/* Mobile: popover dialog from the bottom, overlaying content */}
      <div
        className={`md:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto transition-transform duration-300 ease-in-out ${
            open ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {displayed && <DetailBody selected={displayed} onClose={onClose} />}
        </div>
      </div>
    </>
  );
}
