import { useEffect, useState } from "react";
import type ClassItem from "../../types/classItem";
import type { ClientCorrection } from "../../types/correction";
import { submitCorrection } from "../services/corrections";
import { useSwipeDismiss } from "../hooks/useSwipeDismiss";

export interface SelectedClass {
  item: ClassItem;
  day: string;
}

export type CorrectionApplier = (
  slot: SelectedClass,
  correction: ClientCorrection,
) => void;

interface ClassDetailProps {
  selected: SelectedClass | null;
  onClose: () => void;
  onCorrectionApplied?: CorrectionApplier;
}

function DetailBody({
  selected,
  onClose,
  onCorrectionApplied,
}: {
  selected: SelectedClass;
  onClose: () => void;
  onCorrectionApplied?: CorrectionApplier;
}) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedRoom, setSuggestedRoom] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { item, day } = selected;

  const handleSubmit = async (room: string) => {
    if (!room) return;
    setIsSubmitting(true);
    setError("");
    try {
      const correction = await submitCorrection({
        codigo_materia: item.subjectCode,
        turma: item.class,
        dia_semana: day,
        hora_inicial: item.startTime,
        nome_sala: room,
      });
      setIsSuggesting(false);
      setSuggestedRoom("");
      onCorrectionApplied?.(selected, correction);
    } catch (e: any) {
      setError(e.message || "Não foi possível enviar a correção.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const alternativeProposals = (item.correction?.proposals ?? []).filter(
    (proposal) => proposal.proposedRoom !== item.location,
  );

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
        <div>
          <DetailField
            label="Local"
            value={item.location || "Não encontrada"}
          />
          <button
            onClick={() => setIsSuggesting(!isSuggesting)}
            className="text-[#D44A61] text-xs font-semibold mt-1 hover:underline"
          >
            {isSuggesting ? "Cancelar" : "Sugerir correção"}
          </button>
        </div>
      </div>

      {isSuggesting && (
        <div className="bg-gray-50 p-3 rounded border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">
            Qual é a sala correta?
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={suggestedRoom}
              onChange={(e) => setSuggestedRoom(e.target.value)}
              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
              placeholder="Ex: CAD 1 - Sala 3009"
              disabled={isSubmitting}
            />
            <button
              onClick={() => handleSubmit(suggestedRoom)}
              disabled={isSubmitting || !suggestedRoom}
              className="bg-[#D44A61] text-white text-xs px-3 py-1 rounded font-semibold disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2">
          {error}
        </p>
      )}

      {alternativeProposals.length > 0 && !isSuggesting && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mt-2 space-y-3">
          {alternativeProposals.map((prop, idx) => (
            <div key={idx} className="flex flex-col">
              <p className="text-sm text-yellow-800">
                <strong>Sugestão alternativa:</strong> {prop.proposedRoom}
              </p>
              {!prop.isProposer ? (
                <button
                  onClick={() => handleSubmit(prop.proposedRoom)}
                  disabled={isSubmitting}
                  className="mt-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-900 text-xs px-3 py-1 rounded font-semibold transition-colors self-start"
                >
                  Confirmar esta sala
                </button>
              ) : (
                <p className="text-xs text-yellow-600 mt-1">
                  Sua sugestão. Aguardando confirmação.
                </p>
              )}
            </div>
          ))}
          <button
            onClick={() => setIsSuggesting(true)}
            className="text-xs text-yellow-700 underline mt-2 text-left"
          >
            Nenhuma destas está correta? Sugerir outra.
          </button>
        </div>
      )}

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

export function ClassDetail({
  selected,
  onClose,
  onCorrectionApplied,
}: ClassDetailProps) {
  const open = selected !== null;
  const [displayed, setDisplayed] = useState<SelectedClass | null>(selected);
  const { sheetRef, dragY, dragging } = useSwipeDismiss(open, onClose);

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
          {displayed && (
            <DetailBody
              selected={displayed}
              onClose={onClose}
              onCorrectionApplied={onCorrectionApplied}
            />
          )}
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
          style={{ opacity: 1 - Math.min(dragY / 240, 0.75) }}
        />
        <div
          ref={sheetRef}
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto overscroll-contain ease-in-out ${
            dragging ? "transition-none" : "transition-transform duration-300"
          } ${open ? "translate-y-0" : "translate-y-full"}`}
          style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        >
          {displayed && (
            <DetailBody
              selected={displayed}
              onClose={onClose}
              onCorrectionApplied={onCorrectionApplied}
            />
          )}
        </div>
      </div>
    </>
  );
}
