import axios from "axios";

const getBaseURL = (): string => {
  return `${window.location.origin}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

export default api;
