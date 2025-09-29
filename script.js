// Dapatkan elemen dari DOM
const cityInput = document.getElementById("city_input");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const currentWeatherCard = document.querySelector(".current-weather .details");
const weatherIcon = document.querySelector(".current-weather .weather-icon img");
const fiveDaysForecastCard = document.querySelector(".day-forecast");
const hourlyForecastContainer = document.querySelector(".hourly-forecast-container");
const suggestionsBox = document.querySelector(".search-suggestions");
const favoriteBtn = document.getElementById("favoriteBtn");
const favoritesList = document.getElementById("favoritesList");
const unitC = document.querySelector(".unit-c");
const unitF = document.querySelector(".unit-f");
const loadingOverlay = document.querySelector(".loading-overlay");
const themeToggle = document.getElementById("theme-toggle");
const body = document.body;

// Elemen-elemen untuk Today's Highlights
const airQualityStatus = document.getElementById("air-quality-status");
const pm2_5 = document.getElementById("pm2_5");
const pm10 = document.getElementById("pm10");
const so2 = document.getElementById("so2");
const co = document.getElementById("co");
const no2 = document.getElementById("no2");
const nh3 = document.getElementById("nh3");
const o3 = document.getElementById("o3");
const sunriseTime = document.getElementById("sunrise-time");
const sunsetTime = document.getElementById("sunset-time");
const humidity = document.getElementById("humidity");
const pressure = document.getElementById("pressure");
const visibility = document.getElementById("visibility");
const windSpeed = document.getElementById("wind-speed");
const feelsLike = document.getElementById("feels-like");

const API_KEY = "182ffc402e103d317219d0b1d67369b6"; // Ganti dengan API key Anda

// Variabel Global
let currentCityName = "";
let currentUnit = "celsius";
let lastWeatherData = null;
let lastAqiData = null;
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// --- FUNGSI TEMA ---
const enableLightTheme = () => {
  body.classList.add("light-theme");
  themeToggle.innerHTML = '<i class="fa-light fa-moon"></i>';
  localStorage.setItem("theme", "light");
};

const enableDarkTheme = () => {
  body.classList.remove("light-theme");
  themeToggle.innerHTML = '<i class="fa-light fa-sun"></i>';
  localStorage.setItem("theme", "dark");
};

// --- FUNGSI FORMAT SUHU ---
const formatTemperature = (tempInKelvin) => {
  if (currentUnit === "celsius") {
    return `${(tempInKelvin - 273.15).toFixed(1)}°C`;
  } else {
    const tempInFahrenheit = (tempInKelvin - 273.15) * 1.8 + 32;
    return `${tempInFahrenheit.toFixed(1)}°F`;
  }
};

const formatHighLowTemp = (maxK, minK) => {
  if (currentUnit === "celsius") {
    return `${(maxK - 273.15).toFixed(1)}° / ${(minK - 273.15).toFixed(1)}°`;
  } else {
    const maxF = (maxK - 273.15) * 1.8 + 32;
    const minF = (minK - 273.15) * 1.8 + 32;
    return `${maxF.toFixed(1)}° / ${minF.toFixed(1)}°`;
  }
};

// --- FUNGSI LOKASI FAVORIT ---
const loadFavorites = () => {
  const favorites = JSON.parse(localStorage.getItem("weatherFavorites")) || [];
  favoritesList.innerHTML = "";
  if (favorites.length > 0) {
    favorites.forEach((city) => {
      const div = document.createElement("div");
      div.setAttribute("tabindex", "0"); // Aksesibilitas
      div.innerHTML = `
        <span>${city}</span>
        <i class="fa-solid fa-trash remove-fav" onclick="event.stopPropagation(); removeFromFavorites('${city}')"></i>
      `;
      div.onclick = () => {
        cityInput.value = city;
        getCityCoordinates();
      };
      div.addEventListener("keydown", (e) => {
        if (e.key === "Enter") e.target.click();
      }); // Aksesibilitas
      favoritesList.appendChild(div);
    });
  } else {
    favoritesList.innerHTML = "<p>No favorite locations saved.</p>";
  }
};

const toggleFavorite = () => {
  let favorites = JSON.parse(localStorage.getItem("weatherFavorites")) || [];
  const cityName = currentCityName;
  if (favorites.includes(cityName)) {
    favorites = favorites.filter((fav) => fav !== cityName);
    favoriteBtn.classList.remove("active");
  } else {
    favorites.push(cityName);
    favoriteBtn.classList.add("active");
  }
  localStorage.setItem("weatherFavorites", JSON.stringify(favorites));
  loadFavorites();
};

const removeFromFavorites = (cityName) => {
  let favorites = JSON.parse(localStorage.getItem("weatherFavorites")) || [];
  favorites = favorites.filter((fav) => fav !== cityName);
  localStorage.setItem("weatherFavorites", JSON.stringify(favorites));
  if (currentCityName === cityName) {
    favoriteBtn.classList.remove("active");
  }
  loadFavorites();
};

const checkFavoriteStatus = (cityName) => {
  let favorites = JSON.parse(localStorage.getItem("weatherFavorites")) || [];
  if (favorites.includes(cityName)) {
    favoriteBtn.classList.add("active");
  } else {
    favoriteBtn.classList.remove("active");
  }
};

// --- FUNGSI RIWAYAT & SARAN PENCARIAN ---
const saveToHistory = (cityName) => {
  let history = JSON.parse(localStorage.getItem("weatherSearchHistory")) || [];
  history = history.filter((item) => item.toLowerCase() !== cityName.toLowerCase());
  history.unshift(cityName);
  if (history.length > 5) {
    history.pop();
  }
  localStorage.setItem("weatherSearchHistory", JSON.stringify(history));
};

const showHistory = () => {
  const history = JSON.parse(localStorage.getItem("weatherSearchHistory")) || [];
  suggestionsBox.innerHTML = "";
  if (history.length > 0) {
    history.forEach((city) => {
      const div = document.createElement("div");
      div.setAttribute("tabindex", "0"); // Aksesibilitas
      div.innerHTML = `<i class="fa-light fa-clock-rotate-left"></i> ${city}`;
      div.onclick = () => {
        cityInput.value = city;
        getCityCoordinates();
        suggestionsBox.style.display = "none";
      };
      div.addEventListener("keydown", (e) => {
        if (e.key === "Enter") e.target.click();
      }); // Aksesibilitas
      suggestionsBox.appendChild(div);
    });
    suggestionsBox.style.display = "block";
  }
};

const getSuggestions = (query) => {
  if (!query) {
    showHistory();
    return;
  }
  const GEOCODING_API_URL = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`;
  fetch(GEOCODING_API_URL)
    .then((res) => res.json())
    .then((data) => {
      suggestionsBox.innerHTML = "";
      if (data.length > 0) {
        data.forEach((item) => {
          const cityName = item.state ? `${item.name}, ${item.state}, ${item.country}` : `${item.name}, ${item.country}`;
          const div = document.createElement("div");
          div.setAttribute("tabindex", "0"); // Aksesibilitas
          div.textContent = cityName;
          div.onclick = () => {
            getWeatherDetails(item.name, item.lat, item.lon);
            suggestionsBox.style.display = "none";
          };
          div.addEventListener("keydown", (e) => {
            if (e.key === "Enter") e.target.click();
          }); // Aksesibilitas
          suggestionsBox.appendChild(div);
        });
        suggestionsBox.style.display = "block";
      } else {
        suggestionsBox.style.display = "none";
      }
    });
};

// --- FUNGSI-FUNGSI PEMBUAT KARTU ---
const createCurrentWeatherCard = (cityName, weatherItem) => {
  const date = new Date(weatherItem.dt * 1000);
  const day = days[date.getDay()];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  weatherIcon.src = `https://openweathermap.org/img/wn/${weatherItem.weather[0].icon}@2x.png`;
  weatherIcon.alt = weatherItem.weather[0].description;

  return `
        <h2>${formatTemperature(weatherItem.main.temp)}</h2>
        <p>${weatherItem.weather[0].description}</p>
        <div class="high-low-temp">
            <p><i class="fa-light fa-arrow-up"></i> H: ${formatTemperature(weatherItem.main.temp_max)}</p>
            <p><i class="fa-light fa-arrow-down"></i> L: ${formatTemperature(weatherItem.main.temp_min)}</p>
        </div>
        <hr/>
        <div class="card-footer">
            <p><i class="fa-light fa-calendar"></i> ${day}, ${date.getDate()} ${month} ${year}</p>
            <p><i class="fa-light fa-location-dot"></i> ${cityName}</p>
        </div>
    `;
};

const createForecastCard = (weatherItem, cityName) => {
  const date = new Date(weatherItem.dt * 1000);
  const day = days[date.getDay()];
  const weatherItemJSON = JSON.stringify(weatherItem);

  return `
        <div class="forecast-item" tabindex="0" onclick='updateCurrentWeather(${weatherItemJSON}, "${cityName}")' onkeydown='if(event.key==="Enter") this.click()'>
            <div class="icon-wrapper">
                <img src="https://openweathermap.org/img/wn/${weatherItem.weather[0].icon}.png" alt="${weatherItem.weather[0].description}" />
            </div>
            <p>${day}</p>
            <p class="day-temp">${formatHighLowTemp(weatherItem.main.temp_max, weatherItem.main.temp_min)}</p>
        </div>
    `;
};

const createHourlyForecastItem = (hourlyItem) => {
  const date = new Date(hourlyItem.dt * 1000);
  const hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;

  return `
        <div class="hourly-item">
            <p>${formattedHours} ${ampm}</p>
            <img src="https://openweathermap.org/img/wn/${hourlyItem.weather[0].icon}.png" alt="${hourlyItem.weather[0].description}" />
            <span>${formatTemperature(hourlyItem.main.temp)}</span>
        </div>
    `;
};

const updateHighlights = (weatherData, aqiData) => {
  const current = weatherData.list[0];
  const sunrise = new Date(weatherData.city.sunrise * 1000).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const sunset = new Date(weatherData.city.sunset * 1000).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  humidity.textContent = `${current.main.humidity}%`;
  pressure.textContent = `${current.main.pressure} hPa`;
  visibility.textContent = `${(current.visibility / 1000).toFixed(1)} km`;
  windSpeed.textContent = `${current.wind.speed} m/s`;
  feelsLike.textContent = formatTemperature(current.main.feels_like);
  sunriseTime.textContent = sunrise;
  sunsetTime.textContent = sunset;

  if (aqiData && aqiData.list && aqiData.list.length > 0) {
    const aqi = aqiData.list[0].main.aqi;
    let status = "";
    switch (aqi) {
      case 1:
        status = "Good";
        break;
      case 2:
        status = "Fair";
        break;
      case 3:
        status = "Moderate";
        break;
      case 4:
        status = "Poor";
        break;
      case 5:
        status = "Very Poor";
        break;
      default:
        status = "--";
    }
    airQualityStatus.textContent = status;
    airQualityStatus.className = `bad ${status.toLowerCase().replace(" ", "-")}`;
    const components = aqiData.list[0].components;
    pm2_5.textContent = components.pm2_5.toFixed(1);
    pm10.textContent = components.pm10.toFixed(1);
    so2.textContent = components.so2.toFixed(1);
    co.textContent = components.co.toFixed(1);
    no2.textContent = components.no2.toFixed(1);
    nh3.textContent = components.nh3.toFixed(1);
    o3.textContent = components.o3.toFixed(1);
  }
};

const displayWeatherData = (cityName) => {
  if (!lastWeatherData) return;

  const uniqueForecastDays = [];
  const fiveDaysForecast = lastWeatherData.list.filter((forecast) => {
    const forecastDate = new Date(forecast.dt_txt).getDate();
    if (!uniqueForecastDays.includes(forecastDate)) {
      return uniqueForecastDays.push(forecastDate);
    }
  });

  const today = new Date().getDate();
  const hourlyForecast = lastWeatherData.list.filter((forecast) => {
    const forecastDate = new Date(forecast.dt_txt).getDate();
    return forecastDate === today;
  });

  currentWeatherCard.innerHTML = createCurrentWeatherCard(cityName, lastWeatherData.list[0]);

  fiveDaysForecastCard.innerHTML = "<h2>5 days Forecast</h2>";
  fiveDaysForecast.forEach((weatherItem) => {
    fiveDaysForecastCard.innerHTML += createForecastCard(weatherItem, lastWeatherData.city.name);
  });

  hourlyForecastContainer.innerHTML = "";
  hourlyForecast.forEach((hourlyItem) => {
    hourlyForecastContainer.innerHTML += createHourlyForecastItem(hourlyItem);
  });

  updateHighlights(lastWeatherData, lastAqiData);
};

// --- FUNGSI-FUNGSI UTAMA ---
const getWeatherDetails = (cityName, lat, lon) => {
  loadingOverlay.classList.add("active");

  const WEATHER_API_URL = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
  const AIR_POLLUTION_API_URL = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

  Promise.all([fetch(WEATHER_API_URL).then((res) => res.json()), fetch(AIR_POLLUTION_API_URL).then((res) => res.json())])
    .then(([weatherData, aqiData]) => {
      if (weatherData.cod !== "200") {
        throw new Error(weatherData.message || "Could not fetch weather data.");
      }

      currentCityName = cityName;
      lastWeatherData = weatherData;
      lastAqiData = aqiData;

      const cache = {
        weather: weatherData,
        aqi: aqiData,
        city: cityName,
        timestamp: new Date().getTime(),
      };
      localStorage.setItem("weatherCache", JSON.stringify(cache));

      saveToHistory(cityName);
      checkFavoriteStatus(cityName);
      displayWeatherData(cityName);
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      alert(error.message || "An error occurred while fetching new data!");
    })
    .finally(() => {
      loadingOverlay.classList.remove("active");
    });
};

const getCityCoordinates = () => {
  const cityName = cityInput.value.trim();
  if (!cityName) return;
  const GEOCODING_API_URL = `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${API_KEY}`;
  loadingOverlay.classList.add("active");
  fetch(GEOCODING_API_URL)
    .then((res) => res.json())
    .then((data) => {
      if (!data.length) {
        loadingOverlay.classList.remove("active");
        return alert(`No coordinates found for ${cityName}`);
      }
      const { name, lat, lon } = data[0];
      getWeatherDetails(name, lat, lon);
    })
    .catch(() => {
      loadingOverlay.classList.remove("active");
      alert("An error occurred while fetching the coordinates!");
    });
};

const getUserCoordinates = () => {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const REVERSE_GEOCODING_URL = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`;
      loadingOverlay.classList.add("active");
      fetch(REVERSE_GEOCODING_URL)
        .then((res) => res.json())
        .then((data) => {
          if (!data.length) {
            loadingOverlay.classList.remove("active");
            return alert("Could not determine city name from coordinates.");
          }
          const { name } = data[0];
          getWeatherDetails(name, latitude, longitude);
        })
        .catch(() => {
          loadingOverlay.classList.remove("active");
          alert("An error occurred while fetching the city from coordinates!");
        });
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        loadFavorites();
      }
    }
  );
};

const updateCurrentWeather = (data, cityName) => {
  currentWeatherCard.innerHTML = createCurrentWeatherCard(cityName, data);
};

// --- EVENT LISTENERS ---
locationBtn.addEventListener("click", getUserCoordinates);
searchBtn.addEventListener("click", getCityCoordinates);
favoriteBtn.addEventListener("click", toggleFavorite);

unitC.addEventListener("click", () => {
  if (currentUnit === "celsius") return;
  currentUnit = "celsius";
  unitC.classList.add("active");
  unitF.classList.remove("active");
  localStorage.setItem("weatherUnit", "celsius");
  displayWeatherData(currentCityName);
});

unitF.addEventListener("click", () => {
  if (currentUnit === "fahrenheit") return;
  currentUnit = "fahrenheit";
  unitF.classList.add("active");
  unitC.classList.remove("active");
  localStorage.setItem("weatherUnit", "fahrenheit");
  displayWeatherData(currentCityName);
});

themeToggle.addEventListener("click", () => {
  if (body.classList.contains("light-theme")) {
    enableDarkTheme();
  } else {
    enableLightTheme();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    enableLightTheme();
  } else {
    enableDarkTheme();
  }

  const savedUnit = localStorage.getItem("weatherUnit");
  if (savedUnit === "fahrenheit") {
    currentUnit = "fahrenheit";
    unitF.classList.add("active");
    unitC.classList.remove("active");
  } else {
    currentUnit = "celsius";
    unitC.classList.add("active");
    unitF.classList.remove("active");
  }

  loadFavorites();

  const cachedData = localStorage.getItem("weatherCache");
  if (cachedData) {
    const cache = JSON.parse(cachedData);
    const cacheAgeMinutes = (new Date().getTime() - cache.timestamp) / 1000 / 60;

    if (cacheAgeMinutes < 30) {
      console.log("Loading data from cache.");
      currentCityName = cache.city;
      lastWeatherData = cache.weather;
      lastAqiData = cache.aqi;
      checkFavoriteStatus(currentCityName);
      displayWeatherData(currentCityName);
    }
  }

  getUserCoordinates();
});

cityInput.addEventListener("click", showHistory);
cityInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    getCityCoordinates();
    suggestionsBox.style.display = "none";
  } else {
    getSuggestions(cityInput.value);
  }
});

document.addEventListener("click", (e) => {
  if (!cityInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
    suggestionsBox.style.display = "none";
  }
});
