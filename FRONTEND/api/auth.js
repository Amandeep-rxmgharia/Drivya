import axios from "axios";

export const registerUser = async (userData) => {
  try {
    const response = await axios.post(
      "http://localhost:3000/auth/register",
      userData,
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (userData) => {
  try {
    const response = await axios.post(
      "http://localhost:3000/auth/login",
      userData,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
