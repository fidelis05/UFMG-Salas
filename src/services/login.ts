import api from "./api";

async function login(username: string, password: string) {
  await api.post("/login", {
    username,
    password,
  });
}

export default login;
