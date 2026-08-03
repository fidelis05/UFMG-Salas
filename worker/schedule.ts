import type ClassItem from "../types/classItem";
import type ScheduleResponse from "../types/scheduleResponse";
import type SalaItem from "../types/salaItem";
import {
  buildCorrectionKey,
  getCorrection,
  hashUser,
  listCorrectionSlots,
  toClientCorrection,
  type CorrectionsEnv,
} from "./corrections";

export async function handleScheduleWebSocket(
  ltpaToken: string,
  roomData: SalaItem[],
  env: CorrectionsEnv,
) {
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  server.accept();

  (async () => {
    try {
      const data = await fetchAndProcessSchedule(
        ltpaToken,
        roomData,
        env,
        (status) => {
          server.send(JSON.stringify({ type: "progress", status }));
        },
      );

      server.send(JSON.stringify({ type: "data", payload: data }));
      server.close(1000, "Done");
    } catch (err: any) {
      server.send(JSON.stringify({ type: "error", message: err.toString() }));
      server.close(1011, "Internal Error");
    }
  })();

  // Returning the 101 here is what stops the runtime reporting a hung request.
  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

export async function fetchMatriculas(ltpaToken: string): Promise<any> {
  const response = await fetch(
    "https://sistemas.ufmg.br/siga-ws/seam/resource/rest/WsMatriculas",
    {
      method: "GET",
      headers: {
        Cookie: `LtpaToken2=${ltpaToken}`,
      },
    },
  );

  const arrayBuffer = await response.arrayBuffer();
  const decoder = new TextDecoder("iso-8859-1");
  const text = decoder.decode(arrayBuffer);

  try {
    return JSON.parse(text);
  } catch (error) {
    // if parsing fails, it's likely because the token is invalid and we got HTML back
    throw new Error("SESSION_EXPIRED");
  }
}

export async function fetchAndProcessSchedule(
  ltpaToken: string,
  roomData: SalaItem[],
  env: CorrectionsEnv,
  onProgress?: (status: string) => void,
): Promise<ScheduleResponse> {
  if (onProgress) onProgress("FETCHING_FROM_UNIVERSITY");
  const body = await fetchMatriculas(ltpaToken);

  if (onProgress) onProgress("PROCESSING_ROOMS");

  // Without the secret no pseudonymous id can be derived, so proposals just never
  // come back flagged as the viewer's own; reading the schedule still works.
  const matricula = body.listaObj?.[0]?.matriculas?.[0]?.numeroDoRegistro;
  const userHash =
    matricula && env.CORRECTION_HASH_SECRET
      ? await hashUser(matricula, env.CORRECTION_HASH_SECRET)
      : "";

  // One list() shows which slots carry corrections; only those need a full read.
  const correctionSlots = await listCorrectionSlots(env);

  const allTimes: string[] = [];

  body.listaObj[0].matriculas.forEach((subject: any) => {
    subject.turma.horarios.forEach((horario: any) => {
      allTimes.push(horario.horaInicial, horario.horaFinal);
    });
  });

  const scheduleByDay: { [key: string]: ClassItem[] } = {};

  for (const subject of body.listaObj[0].matriculas) {
    for (const horario of subject.turma.horarios) {
      const dayKey = horario.diaDaSemana;
      if (!scheduleByDay[dayKey]) {
        scheduleByDay[dayKey] = [];
      }

      const subjectCode = subject.turma.atividadeAcademica.codigo;
      const classCode = subject.turma.identificadorTurma;

      let location = findRoom({
        roomData: roomData,
        subjectCode,
        classCode,
        startTime: horario.horaInicial,
        day: dayKey,
      })!;

      const correctionKey = buildCorrectionKey(
        subjectCode,
        classCode,
        dayKey,
        horario.horaInicial,
      );

      let correctionData: ClassItem["correction"];

      if (correctionSlots.has(correctionKey)) {
        const entry = await getCorrection(env, correctionKey);
        if (entry) {
          if (entry.status === "approved" && entry.approvedRoom) {
            location = entry.approvedRoom;
          }
          correctionData = toClientCorrection(entry, userHash);
        }
      }

      const classItem: ClassItem = {
        startTime: horario.horaInicial,
        endTime: horario.horaFinal,
        duration: calculateDuration(horario.horaInicial, horario.horaFinal),
        location,
        subjectName: subject.turma.atividadeAcademica.nomeReduzido,
        subjectCode,
        description: subject.turma.atividadeAcademica.ementaAtual,
        class: classCode,
        professor:
          subject.turma.professores.length > 0
            ? subject.turma.professores.map((prof: any) => prof.contrato.nome)
            : [""],
        level: subject.turma.atividadeAcademica.nivel,
        workload: subject.turma.atividadeAcademica.cargaHoraria,
        classType: subject.turma.tipoDaTurma,
        department: subject.turma.ofertanteResponsavel,
        correction: correctionData,
      };

      scheduleByDay[dayKey].push(classItem);
    }
  }

  const scheduleArray = Object.keys(scheduleByDay).map((day) => ({
    [day]: scheduleByDay[day],
  }));

  const earliestTime = allTimes.reduce((earliest, time) =>
    time < earliest ? time : earliest,
  );
  const latestTime = allTimes.reduce((latest, time) =>
    time > latest ? time : latest,
  );

  const data: ScheduleResponse = {
    semester: body.listaObj[0].semestreLetivo,
    initialDate: body.listaObj[0].dataInicialSemestre,
    finalDate: body.listaObj[0].dataFinalSemestre,
    earliestTime: earliestTime,
    latestTime: latestTime,
    schedule: scheduleArray,
  };

  return data;
}

function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return endMinutes - startMinutes;
}

interface findRoomProps {
  roomData: SalaItem[];
  subjectCode: string;
  classCode: string;
  startTime: string;
  day: string;
}

export function findRoom({
  roomData,
  subjectCode,
  classCode,
  startTime,
  day,
}: findRoomProps) {
  return (
    roomData.find(
      (sala: SalaItem) =>
        sala.codigo_materia === subjectCode &&
        sala.turma === classCode &&
        sala.hora_inicial === startTime &&
        sala.dia_semana
          .toLowerCase()
          .includes(day.substring(0, 3).toLowerCase()),
    )?.nome_sala || "Sala não encontrada"
  );
}
