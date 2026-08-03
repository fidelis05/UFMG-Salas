import { useEffect, useState } from "react";
import type ScheduleResponse from "../../types/scheduleResponse";
import { generateIcs } from "../utils/ics";

interface ExportIcsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ExportIcsModal({ open, onClose }: ExportIcsModalProps) {
  const [hasSchedule, setHasSchedule] = useState(false);

  useEffect(() => {
    if (open) {
      setHasSchedule(!!localStorage.getItem("schedule"));
    }
  }, [open]);

  const handleExport = () => {
    const raw = localStorage.getItem("schedule");
    if (!raw) return;

    const ics = generateIcs(JSON.parse(raw) as ScheduleResponse);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grade-ufmg.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-opacity duration-200 ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold text-gray-800">
            Exportar para Calendário
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-600">
          Baixe sua grade como um arquivo .ics e importe no Google Calendar,
          Apple Calendário, Outlook ou similar. As aulas se repetem
          semanalmente até o fim do semestre.
        </p>
        <p className="text-sm text-gray-600">
          Se você já tinha importado antes, importar de novo{" "}
          <strong className="text-gray-800">atualiza</strong> os horários e
          salas dos eventos existentes — mas{" "}
          <strong className="text-gray-800">não apaga</strong> eventos de
          disciplinas que saíram da sua grade ou de turmas que mudaram; esses
          ficam órfãos e precisam ser removidos manualmente no seu app de
          calendário.
        </p>

        {!hasSchedule && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Acesse sua Grade pelo menos uma vez antes de exportar.
          </p>
        )}

        <button
          onClick={handleExport}
          disabled={!hasSchedule}
          className="bg-[#D44A61] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#b93d52] disabled:opacity-50 disabled:hover:bg-[#D44A61] transition-colors w-full"
        >
          Exportar
        </button>
      </div>
    </div>
  );
}
