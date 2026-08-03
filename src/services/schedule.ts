interface getScheduleParams {
  forceReload: boolean;
}

async function getSchedule(
  params: getScheduleParams,
  onProgress?: (status: string) => void
) {
  const storage = localStorage.getItem("schedule");

  if (!params.forceReload && storage) {
    return JSON.parse(storage);
  }

  // Use WebSocket
  return new Promise((resolve, reject) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/api/schedule-ws`
    );

    ws.onopen = () => {
      ws.send("start");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "progress") {
          if (onProgress) onProgress(message.status);
          return;
        }
        if (message.type === "data") {
          localStorage.setItem("schedule", JSON.stringify(message.payload));
          window.dispatchEvent(new Event("schedule-updated"));
          resolve(message.payload);
          ws.close();
          return;
        }
        if (message.type === "error") {
          reject(new Error(message.message));
          ws.close();
          return;
        }
      } catch (e) {
        reject(e);
        ws.close();
      }
    };

    ws.onerror = (error) => {
      reject(error);
    };
  });
}

export default getSchedule;
