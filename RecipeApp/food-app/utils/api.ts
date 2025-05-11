import axios from "axios";

export const BASE_URL = "https://vaibhavbansal1.pythonanywhere.com";

const BASE_API_URL = BASE_URL + '/api';

export const fetchNewTokens = async (refreshToken: string) => {
  const response = await axios.post(`${BASE_API_URL}/get/refresh/`, {
    refresh_token: refreshToken,
  });
  return response.data; // { access_token, refresh_token: new_refresh_token }
};
