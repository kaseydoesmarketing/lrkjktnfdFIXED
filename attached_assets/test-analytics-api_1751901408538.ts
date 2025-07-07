import axios from "axios";

export const getActiveTests = async () => {
  const { data } = await axios.get("/api/tests/active");
  return data;
};

export const cancelTest = async (testId: string) => {
  await axios.post(`/api/tests/${testId}/cancel`);
};

export const generateTitle = async (testId: string) => {
  await axios.post(`/api/tests/${testId}/generate-title`);
};

export const rotateTitle = async () => {
  await axios.post("/api/tests/rotate");
};