
const searchForm = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const searchButton = document.querySelector("#search-button");
const statusMessage = document.querySelector("#status");
const weatherPanel = document.querySelector("#weather-panel");

const GEOCODING_API =
  "https://geocoding-api.open-meteo.com/v1/search";

const FORECAST_API =
  "https://api.open-meteo.com/v1/forecast";

// Convert Open-Meteo weather codes into descriptions and icons.
function getWeatherInfo(code, isDay = 1) {
  if (code === 0) {
    return isDay
      ? { text: "Clear sky", icon: "☀️" }
      : { text: "Clear sky", icon: "🌙" };
  }

  if (code === 1) {
    return { text: "Mainly clear", icon: "🌤️" };
  }

  if (code === 2) {
    return { text: "Partly cloudy", icon: "⛅" };
  }

  if (code === 3) {
    return { text: "Overcast", icon: "☁️" };
  }

  if ([45, 48].includes(code)) {
    return { text: "Foggy", icon: "🌫️" };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return { text: "Drizzle", icon: "🌦️" };
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { text: "Rain", icon: "🌧️" };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { text: "Snow", icon: "❄️" };
  }

  if ([95, 96, 99].includes(code)) {
    return { text: "Thunderstorm", icon: "⛈️" };
  }

  return { text: "Weather unavailable", icon: "🌡️" };
}

// Fetch JSON and report HTTP errors clearly.
async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather service error (${response.status}).`);
  }

  return response.json();
}

// Find the city and obtain its coordinates.
async function findCity(cityName) {
  const params = new URLSearchParams({
    name: cityName,
    count: "1",
    language: "en",
    format: "json"
  });

  const data = await fetchJSON(
    `${GEOCODING_API}?${params}`
  );

  if (!data.results || data.results.length === 0) {
    throw new Error(
      "City not found. Please check the spelling and try again."
    );
  }

  return data.results[0];
}

// Fetch current conditions and daily forecasts.
async function getForecast(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: latitude,
    longitude: longitude,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min"
    ].join(","),
    forecast_days: "7",
    timezone: "auto"
  });

  return fetchJSON(`${FORECAST_API}?${params}`);
}

// Display the current weather.
function displayCurrentWeather(city, data) {
  const current = data.current;

  const info = getWeatherInfo(
    current.weather_code,
    current.is_day
  );

  const region = [city.name, city.admin1, city.country]
    .filter((value, index, array) =>
      value && array.indexOf(value) === index
    )
    .join(", ");

  document.querySelector("#location").textContent = region;

  document.querySelector("#local-time").textContent =
    `Local time: ${current.time.replace("T", " ")}`;

  document.querySelector("#condition").textContent = info.text;

  document.querySelector("#weather-icon").textContent = info.icon;

  document.querySelector("#temperature").textContent =
    `${Math.round(current.temperature_2m)}°C`;

  document.querySelector("#feels-like").textContent =
    `Feels like ${Math.round(current.apparent_temperature)}°C`;

  document.querySelector("#humidity").textContent =
    `${current.relative_humidity_2m}%`;

  document.querySelector("#wind").textContent =
    `${current.wind_speed_10m} km/h`;

  document.querySelector("#clouds").textContent =
    `${current.cloud_cover}%`;

  document.querySelector("#rain").textContent =
    `${current.precipitation} mm`;
}

// Display the seven-day forecast.
function displayForecast(data) {
  const forecastContainer = document.querySelector("#forecast");
  forecastContainer.replaceChildren();

  const daily = data.daily;

  daily.time.forEach((date, index) => {
    const info = getWeatherInfo(daily.weather_code[index]);

    const card = document.createElement("article");
    card.className = "forecast-card";

    const day = document.createElement("p");
    day.textContent = index === 0
      ? "Today"
      : new Date(`${date}T12:00:00`)
          .toLocaleDateString("en", { weekday: "short" });

    const icon = document.createElement("div");
    icon.className = "forecast-icon";
    icon.textContent = info.icon;
    icon.setAttribute("aria-label", info.text);

    const condition = document.createElement("p");
    condition.textContent = info.text;

    const temperature = document.createElement("div");
    temperature.className = "forecast-temp";
    temperature.textContent =
      `${Math.round(daily.temperature_2m_max[index])}° / ` +
      `${Math.round(daily.temperature_2m_min[index])}°`;

    card.append(day, icon, condition, temperature);
    forecastContainer.append(card);
  });
}

// Handle the search form.
searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const cityName = cityInput.value.trim();

  if (!cityName) {
    statusMessage.textContent = "Please enter a city name.";
    return;
  }

  searchButton.disabled = true;
  statusMessage.className = "status";
  statusMessage.textContent = "Loading weather data...";
  weatherPanel.hidden = true;

  try {
    const city = await findCity(cityName);

    const data = await getForecast(
      city.latitude,
      city.longitude
    );

    if (!data.current || !data.daily) {
      throw new Error("Weather data is incomplete. Try again.");
    }

    displayCurrentWeather(city, data);
    displayForecast(data);

    weatherPanel.hidden = false;
    statusMessage.textContent = "Weather loaded successfully.";
  } catch (error) {
    statusMessage.className = "status error";
    statusMessage.textContent =
      error.message || "Unable to load weather. Please try again.";
  } finally {
    searchButton.disabled = false;
  }
});
