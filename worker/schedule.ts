import type ClassItem from "../types/classItem";
import type ScheduleResponse from "../types/scheduleResponse";
import type SalaItem from "../types/salaItem";

export async function handleScheduleWebSocket(
  ltpaToken: string,
  roomData: SalaItem[]
) {
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  server.accept();

  (async () => {
    try {
      const data = await fetchAndProcessSchedule(
        ltpaToken,
        roomData,
        (status) => {
          // send progress updates through the socket
          server.send(JSON.stringify({ type: "progress", status }));
        }
      );

      // final data
      server.send(JSON.stringify({ type: "data", payload: data }));
      server.close(1000, "Done");
    } catch (err: any) {
      server.send(JSON.stringify({ type: "error", message: err.toString() }));
      server.close(1011, "Internal Error");
    }
  })();

  // THIS is the response the runtime is looking for to prevent the "hung" error
  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

async function fetchMatriculas(ltpaToken: string): Promise<any> {
  const response = await fetch(
    "https://sistemas.ufmg.br/siga-ws/seam/resource/rest/WsMatriculas",
    {
      method: "GET",
      headers: {
        Cookie: `LtpaToken2=${ltpaToken}`,
      },
    }
  );

  // handle ISO-8859-1 encoding properly
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
  onProgress?: (status: string) => void
): Promise<ScheduleResponse> {
  if (onProgress) onProgress("FETCHING_FROM_UNIVERSITY");
  const body = await fetchMatriculas(ltpaToken);

  if (onProgress) onProgress("PROCESSING_ROOMS");

  // collect every horario's start/end time, used below to find the day's bounds
  const allTimes: string[] = [];

  body.listaObj[0].matriculas.forEach((subject: any) => {
    subject.turma.horarios.forEach((horario: any) => {
      allTimes.push(horario.horaInicial, horario.horaFinal);
    });
  });

  // group classes by day of week
  const scheduleByDay: { [key: string]: ClassItem[] } = {};

  body.listaObj[0].matriculas.forEach((subject: any) => {
    subject.turma.horarios.forEach((horario: any) => {
      const dayKey = horario.diaDaSemana;
      if (!scheduleByDay[dayKey]) {
        scheduleByDay[dayKey] = [];
      }

      const classItem: ClassItem = {
        startTime: horario.horaInicial,
        endTime: horario.horaFinal,
        duration: calculateDuration(horario.horaInicial, horario.horaFinal),
        location: findRoom({
          roomData: roomData,
          subjectCode: subject.turma.atividadeAcademica.codigo,
          classCode: subject.turma.identificadorTurma,
          startTime: horario.horaInicial,
          day: dayKey,
        })!,
        subjectName: subject.turma.atividadeAcademica.nomeReduzido,
        subjectCode: subject.turma.atividadeAcademica.codigo,
        description: subject.turma.atividadeAcademica.ementaAtual,
        class: subject.turma.identificadorTurma,
        professor:
          subject.turma.professores.length > 0
            ? subject.turma.professores.map((prof: any) => prof.contrato.nome)
            : [""],
        level: subject.turma.atividadeAcademica.nivel,
        workload: subject.turma.atividadeAcademica.cargaHoraria,
        classType: subject.turma.tipoDaTurma,
        department: subject.turma.ofertanteResponsavel,
      };

      scheduleByDay[dayKey].push(classItem);
    });
  });

  // convert to array format expected by Response interface
  const scheduleArray = Object.keys(scheduleByDay).map((day) => ({
    [day]: scheduleByDay[day],
  }));

  // calculate earliest and latest times
  const earliestTime = allTimes.reduce((earliest, time) =>
    time < earliest ? time : earliest
  );
  const latestTime = allTimes.reduce((latest, time) =>
    time > latest ? time : latest
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
          .includes(day.substring(0, 3).toLowerCase())
    )?.nome_sala || "Sala não encontrada"
  );
}
