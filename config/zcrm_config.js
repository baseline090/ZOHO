require("dotenv").config();
const axios = require("axios");

let accessToken = null; // Store access token in memory

async function generateAccessToken() {
  try {
    const response = await axios.post(process.env.ZOHO_TOKEN_URL, null, {
      params: {
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
      },
    });
    accessToken = response.data.access_token;
    console.log("Access token refreshed successfully!");
    return accessToken;
  } catch (error) {
    console.error("Error generating access token:", error.response.data);
    throw new Error("Failed to generate access token.");
  }
}

async function getAccessToken() {
  if (!accessToken) {
    accessToken = await generateAccessToken();
  }
  return accessToken;
}

module.exports = { getAccessToken };











