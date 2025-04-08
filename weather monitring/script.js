// API key for OpenWeatherMap
const API_KEY = 'f2f4c60b157c298e413ef19329fda9aa';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache duration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const CACHE_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of cached items
let weatherCache = {};

// Error handling class
class WeatherError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'WeatherError';
    }
}

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const temperatureElement = document.getElementById('temperature');
const conditionElement = document.getElementById('condition');
const weatherIconElement = document.getElementById('weather-icon');
const cityElement = document.getElementById('city');
const countryElement = document.getElementById('country');
const currentTimeElement = document.getElementById('current-time');
const currentDateElement = document.getElementById('current-date');
const humidityElement = document.getElementById('humidity');
const pressureElement = document.getElementById('pressure');
const visibilityElement = document.getElementById('visibility');
const windElement = document.getElementById('wind');
const uvIndexElement = document.getElementById('uv-index');
const dewPointElement = document.getElementById('dew-point');
const morningTempElement = document.getElementById('morning-temp');
const afternoonTempElement = document.getElementById('afternoon-temp');
const eveningTempElement = document.getElementById('evening-temp');
const hourlyForecastContainer = document.getElementById('hourly-forecast-container');
const dailyForecastContainer = document.getElementById('daily-forecast-container');
const loadingScreen = document.querySelector('.loading-screen');
const errorContainer = document.querySelector('.error-container');
const errorMessageElement = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const changeLocationBtn = document.querySelector('.change-location');
const celsiusBtn = document.getElementById('celsius');
const fahrenheitBtn = document.getElementById('fahrenheit');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.weather-details');
const backgroundOverlay = document.querySelector('.background-overlay');
const timezones = document.querySelectorAll('.timezone');

// State variables
let currentWeatherData = null;
let currentCity = 'Los Angeles';
let units = 'metric'; // metric (Celsius) or imperial (Fahrenheit)
let currentTimezone = 'local';
let intervalId = null;

// Weather condition to background mapping
const weatherBackgrounds = {
    'clear': 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1674&q=80',
    'clouds': 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1602&q=80',
    'rain': 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
    'drizzle': 'https://images.unsplash.com/photo-1541919329513-35f7af297129?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
    'thunderstorm': 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1742&q=80',
    'snow': 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1708&q=80',
    'mist': 'https://images.unsplash.com/photo-1543968996-ee822b8176ba?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
    'fog': 'https://images.unsplash.com/photo-1543968996-ee822b8176ba?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
    'haze': 'https://images.unsplash.com/photo-1533757704860-24a42113ae38?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
    'dust': 'https://images.unsplash.com/photo-1578650122745-d3695d3d7f22?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1742&q=80',
    'default': 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1548&q=80'
};

// Weather condition to icon mapping
const weatherIcons = {
    '01d': 'fa-sun', // clear sky day
    '01n': 'fa-moon', // clear sky night
    '02d': 'fa-cloud-sun', // few clouds day
    '02n': 'fa-cloud-moon', // few clouds night
    '03d': 'fa-cloud', // scattered clouds
    '03n': 'fa-cloud',
    '04d': 'fa-cloud', // broken clouds
    '04n': 'fa-cloud',
    '09d': 'fa-cloud-showers-heavy', // shower rain
    '09n': 'fa-cloud-showers-heavy',
    '10d': 'fa-cloud-rain', // rain day
    '10n': 'fa-cloud-rain', // rain night
    '11d': 'fa-bolt', // thunderstorm
    '11n': 'fa-bolt',
    '13d': 'fa-snowflake', // snow
    '13n': 'fa-snowflake',
    '50d': 'fa-smog', // mist
    '50n': 'fa-smog'
};

// Time formatting options
const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
};

const dateOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
};

// Initialize the app
function init() {
    try {
        console.log('Initializing application...');
        
        // Set up event listeners
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
        changeLocationBtn.addEventListener('click', () => {
            searchInput.focus();
        });
        celsiusBtn.addEventListener('click', () => setUnits('metric'));
        fahrenheitBtn.addEventListener('click', () => setUnits('imperial'));
        retryBtn.addEventListener('click', () => getWeatherData(currentCity));
        
        // Set up tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                switchTab(tabId);
            });
        });
        
        // Set up timezone switching
        timezones.forEach(timezone => {
            timezone.addEventListener('click', () => {
                const tz = timezone.getAttribute('data-timezone');
                switchTimezone(tz);
            });
        });
        
        // Get user's location or use default
        if (navigator.geolocation) {
            console.log('Requesting geolocation...');
            showLoading();
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('Geolocation received:', position);
                    const { latitude, longitude } = position.coords;
                    getWeatherByCoords(latitude, longitude);
                },
                (error) => {
                    console.error("Error getting location:", error);
                    showError("Could not get your location. Using default city.");
                    getWeatherData(currentCity);
                }
            );
        } else {
            console.log('Geolocation not available, using default city');
            getWeatherData(currentCity);
        }
    } catch (error) {
        console.error('Error in init:', error);
        showError('Failed to initialize the application');
    }
}

// Handle search
function handleSearch() {
    try {
        const city = searchInput.value.trim();
        if (!city) {
            showError('Please enter a city name');
            return;
        }
        
        // Basic input validation
        if (city.length > 100) {
            showError('City name is too long');
            return;
        }
        
        // Sanitize input
        const sanitizedCity = city.replace(/[<>]/g, '');
        
        getWeatherData(sanitizedCity);
        searchInput.value = '';
    } catch (error) {
        console.error('Error in handleSearch:', error);
        showError('An error occurred while processing your search');
    }
}

// Cache management
function cleanupCache() {
    const now = Date.now();
    const expiredKeys = [];
    let cacheSize = 0;

    // Find expired items and count cache size
    for (const [key, value] of Object.entries(weatherCache)) {
        cacheSize++;
        if (now - value.timestamp > CACHE_DURATION) {
            expiredKeys.push(key);
        }
    }

    // Remove expired items
    expiredKeys.forEach(key => {
        delete weatherCache[key];
        cacheSize--;
    });

    // If still too many items, remove oldest ones
    if (cacheSize > MAX_CACHE_SIZE) {
        const sortedKeys = Object.keys(weatherCache)
            .sort((a, b) => weatherCache[b].timestamp - weatherCache[a].timestamp);
        
        sortedKeys.slice(MAX_CACHE_SIZE).forEach(key => {
            delete weatherCache[key];
        });
    }
}

// Initialize cache cleanup
setInterval(cleanupCache, CACHE_CLEANUP_INTERVAL);

// Get weather data by city name
async function getWeatherData(city, retryCount = 0) {
    showLoading();
    console.log(`Fetching weather data for ${city}...`);
    
    try {
        // Check cache first
        const cacheKey = `${city}-${units}`;
        const cachedData = weatherCache[cacheKey];
        
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
            console.log('Using cached data for', city);
            try {
                updateUI(cachedData);
                hideLoading();
                return;
            } catch (error) {
                console.error('Error using cached data:', error);
                delete weatherCache[cacheKey];
            }
        }

        // Get weather data from OpenWeatherMap
        console.log('Making API request to OpenWeatherMap...');
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${units === 'metric' ? 'metric' : 'imperial'}`);
        console.log('API response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new WeatherError('City not found. Please check the spelling and try again.', 404);
            } else if (response.status === 401) {
                throw new WeatherError('Invalid API key. Please check your API key.', 401);
            } else if (response.status === 429) {
                if (retryCount < MAX_RETRIES) {
                    console.log(`Rate limited, retrying in ${RETRY_DELAY}ms...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    return getWeatherData(city, retryCount + 1);
                }
                throw new WeatherError('Too many requests. Please wait a minute and try again.', 429);
            } else {
                throw new WeatherError('Failed to fetch weather data. Status: ' + response.status, response.status);
            }
        }
        
        const weatherData = await response.json();
        console.log('Weather data received:', weatherData);
        
        // Get forecast data
        const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=${units === 'metric' ? 'metric' : 'imperial'}`);
        const forecastData = await forecastResponse.json();
        
        // Combine current weather and forecast data
        const combinedData = {
            current: weatherData,
            forecast: forecastData
        };
        
        // Update cache
        weatherCache[cacheKey] = {
            data: combinedData,
            timestamp: Date.now()
        };
        
        // Update UI with the data
        updateUI(combinedData);
        hideLoading();
        hideError();
    } catch (error) {
        console.error('Error in getWeatherData:', error);
        showError(error.message);
        hideLoading();
    }
}

// Get weather data by coordinates
async function getWeatherByCoords(lat, lon, retryCount = 0) {
    showLoading();
    
    try {
        // Check cache first
        const cacheKey = `${lat}-${lon}-${units}`;
        const cachedData = weatherCache[cacheKey];
        
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
            try {
                updateUI(cachedData);
                hideLoading();
                return;
            } catch (error) {
                console.error('Error using cached data:', error);
                delete weatherCache[cacheKey];
            }
        }

        // Get weather data from OpenWeatherMap
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units === 'metric' ? 'metric' : 'imperial'}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new WeatherError('Location not found. Please try again.', 404);
            } else if (response.status === 401) {
                throw new WeatherError('Invalid API key. Please check your API key.', 401);
            } else if (response.status === 429) {
                if (retryCount < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    return getWeatherByCoords(lat, lon, retryCount + 1);
                }
                throw new WeatherError('Too many requests. Please wait a minute and try again.', 429);
            } else {
                throw new WeatherError('Failed to fetch weather data. Status: ' + response.status, response.status);
            }
        }
        
        const weatherData = await response.json();
        
        // Get forecast data
        const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units === 'metric' ? 'metric' : 'imperial'}`);
        const forecastData = await forecastResponse.json();
        
        // Combine current weather and forecast data
        const combinedData = {
            current: weatherData,
            forecast: forecastData
        };
        
        // Update cache
        weatherCache[cacheKey] = {
            data: combinedData,
            timestamp: Date.now()
        };
        
        // Update UI with the data
        updateUI(combinedData);
        hideLoading();
        hideError();
    } catch (error) {
        console.error('Error in getWeatherByCoords:', error);
        showError(error.message);
        hideLoading();
    }
}

// Update UI with weather data
function updateUI(weatherData) {
    try {
        // Store data for later use
        currentWeatherData = weatherData;
        currentCity = weatherData.current.name;
        
        // Update current weather
        const temp = Math.round(weatherData.current.main.temp);
        temperatureElement.textContent = `${temp}°`;
        conditionElement.textContent = weatherData.current.weather[0].description;
        cityElement.textContent = weatherData.current.name;
        countryElement.textContent = weatherData.current.sys.country;
        
        // Update weather icon
        const iconCode = weatherData.current.weather[0].icon;
        weatherIconElement.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        
        // Update weather details
        humidityElement.textContent = `${weatherData.current.main.humidity}%`;
        pressureElement.textContent = `${weatherData.current.main.pressure} hPa`;
        visibilityElement.textContent = `${weatherData.current.visibility / 1000} km`;
        windElement.textContent = `${Math.round(weatherData.current.wind.speed)} km/h`;
        
        // Update UV index (not available in free tier)
        uvIndexElement.textContent = 'N/A';
        
        // Update day parts forecast
        const today = new Date();
        const morning = new Date(today);
        morning.setHours(8, 0, 0, 0);
        const afternoon = new Date(today);
        afternoon.setHours(14, 0, 0, 0);
        const evening = new Date(today);
        evening.setHours(20, 0, 0, 0);
        
        const morningForecast = weatherData.forecast.list.find(item => 
            new Date(item.dt * 1000).getHours() === 8
        );
        const afternoonForecast = weatherData.forecast.list.find(item => 
            new Date(item.dt * 1000).getHours() === 14
        );
        const eveningForecast = weatherData.forecast.list.find(item => 
            new Date(item.dt * 1000).getHours() === 20
        );
        
        morningTempElement.textContent = morningForecast ? `${Math.round(morningForecast.main.temp)}°` : '--°';
        afternoonTempElement.textContent = afternoonForecast ? `${Math.round(afternoonForecast.main.temp)}°` : '--°';
        eveningTempElement.textContent = eveningForecast ? `${Math.round(eveningForecast.main.temp)}°` : '--°';
        
        // Update hourly forecast
        updateHourlyForecast(weatherData.forecast.list.slice(0, 24));
        
        // Update daily forecast
        updateDailyForecast(weatherData.forecast.list);
        
        // Update background based on weather condition
        updateBackground(weatherData.current.weather[0].main.toLowerCase());
        
        // Start or reset the clock
        updateClock();
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(updateClock, 1000);
    } catch (error) {
        console.error('Error in updateUI:', error);
        showError('Failed to update weather information');
    }
}

// Update hourly forecast
function updateHourlyForecast(hourlyData) {
    try {
        hourlyForecastContainer.innerHTML = '';
        
        hourlyData.forEach((hour, index) => {
            const time = new Date(hour.dt * 1000);
            const temp = Math.round(hour.main.temp);
            const iconCode = hour.weather[0].icon;
            
            const hourlyItem = document.createElement('div');
            hourlyItem.className = 'forecast-item';
            hourlyItem.innerHTML = `
                <div class="forecast-time">${index === 0 ? 'Now' : time.toLocaleTimeString([], { hour: '2-digit' })}</div>
                <img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="Weather icon" class="forecast-icon">
                <div class="forecast-temp">${temp}°</div>
            `;
            
            hourlyForecastContainer.appendChild(hourlyItem);
        });
    } catch (error) {
        console.error('Error in updateHourlyForecast:', error);
    }
}

// Update daily forecast
function updateDailyForecast(dailyData) {
    try {
        dailyForecastContainer.innerHTML = '';
        
        // Group forecast by day
        const dailyForecasts = {};
        dailyData.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toLocaleDateString();
            
            if (!dailyForecasts[dayKey]) {
                dailyForecasts[dayKey] = {
                    date: date,
                    temps: [],
                    icon: item.weather[0].icon
                };
            }
            dailyForecasts[dayKey].temps.push(item.main.temp);
        });
        
        // Display next 7 days
        Object.values(dailyForecasts).slice(0, 7).forEach((day, index) => {
            const maxTemp = Math.round(Math.max(...day.temps));
            const minTemp = Math.round(Math.min(...day.temps));
            const dayName = index === 0 ? 'Today' : day.date.toLocaleDateString([], { weekday: 'short' });
            
            const dailyItem = document.createElement('div');
            dailyItem.className = 'forecast-item';
            dailyItem.innerHTML = `
                <div class="forecast-day">${dayName}</div>
                <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" alt="Weather icon" class="forecast-icon">
                <div class="forecast-temp">${maxTemp}° <span style="opacity: 0.7">${minTemp}°</span></div>
            `;
            
            dailyForecastContainer.appendChild(dailyItem);
        });
    } catch (error) {
        console.error('Error in updateDailyForecast:', error);
    }
}

// Update background based on weather condition
function updateBackground(weatherCondition) {
    let backgroundUrl;
    
    // Find the appropriate background image
    for (const [condition, url] of Object.entries(weatherBackgrounds)) {
        if (weatherCondition.includes(condition)) {
            backgroundUrl = url;
            break;
        }
    }
    
    // Use default if no match found
    if (!backgroundUrl) {
        backgroundUrl = weatherBackgrounds.default;
    }
    
    // Set the background image
    backgroundOverlay.style.backgroundImage = `url('${backgroundUrl}')`;
}

// Update clock and date
function updateClock() {
    try {
        const now = new Date();
        
        // Adjust time based on selected timezone
        if (currentTimezone !== 'local') {
            const timezone = getTimezoneString(currentTimezone);
            const options = { ...timeOptions, timeZone: timezone };
            const dateOptions = { ...dateOptions, timeZone: timezone };
            
            try {
                currentTimeElement.textContent = now.toLocaleTimeString([], options);
                currentDateElement.textContent = now.toLocaleDateString([], dateOptions);
            } catch (error) {
                console.error('Error formatting time:', error);
                // Fallback to local time
                currentTimeElement.textContent = now.toLocaleTimeString([], timeOptions);
                currentDateElement.textContent = now.toLocaleDateString([], dateOptions);
            }
        } else {
            currentTimeElement.textContent = now.toLocaleTimeString([], timeOptions);
            currentDateElement.textContent = now.toLocaleDateString([], dateOptions);
        }
    } catch (error) {
        console.error('Error updating clock:', error);
        currentTimeElement.textContent = '--:--';
        currentDateElement.textContent = 'Error';
    }
}

// Get timezone string from timezone code
function getTimezoneString(timezone) {
    const timezoneMap = {
        'EST': 'America/New_York',
        'GMT': 'Europe/London',
        'IST': 'Asia/Kolkata',
        'PDT': 'America/Los_Angeles',
        'JST': 'Asia/Tokyo',
        'CET': 'Europe/Paris',
        'AEST': 'Australia/Sydney',
        'CST': 'America/Chicago',
        'MST': 'America/Denver',
        'PST': 'America/Los_Angeles',
        'HST': 'Pacific/Honolulu',
        'AKST': 'America/Anchorage',
        'local': Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    if (!timezoneMap[timezone]) {
        console.warn(`Unsupported timezone: ${timezone}. Defaulting to local timezone.`);
        return timezoneMap.local;
    }
    return timezoneMap[timezone];
}

// Switch between tabs
function switchTab(tabId) {
    // Update active tab
    tabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Show corresponding content
    tabContents.forEach(content => {
        if (content.id === `${tabId}-details`) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });
}

// Switch between timezones
function switchTimezone(timezone) {
    try {
        if (!timezone) {
            throw new Error('No timezone provided');
        }
        
        currentTimezone = timezone;
        
        // Update active timezone
        timezones.forEach(tz => {
            if (tz.getAttribute('data-timezone') === timezone) {
                tz.classList.add('active');
            } else {
                tz.classList.remove('active');
            }
        });
        
        // Update clock immediately
        updateClock();
    } catch (error) {
        console.error('Error switching timezone:', error);
        showError('Failed to switch timezone. Using local time.');
        switchTimezone('local');
    }
}

// Set temperature units (Celsius or Fahrenheit)
function setUnits(newUnits) {
    if (units === newUnits) return;
    
    units = newUnits;
    
    // Update active unit button
    if (units === 'metric') {
        celsiusBtn.classList.add('active');
        fahrenheitBtn.classList.remove('active');
    } else {
        celsiusBtn.classList.remove('active');
        fahrenheitBtn.classList.add('active');
    }
    
    // Refresh weather data with new units
    if (currentWeatherData) {
        getWeatherData(currentCity);
    }
}

// Show loading screen
function showLoading() {
    try {
        loadingScreen.style.display = 'flex';
    } catch (error) {
        console.error('Error in showLoading:', error);
    }
}

// Hide loading screen
function hideLoading() {
    try {
        loadingScreen.style.display = 'none';
    } catch (error) {
        console.error('Error in hideLoading:', error);
    }
}

// Show error message
function showError(message) {
    try {
        if (!message) {
            message = 'An unknown error occurred';
        }
        
        console.error('Error occurred:', message);
        errorMessageElement.textContent = message;
        errorContainer.style.display = 'flex';
        hideLoading();
        
        // Auto-hide error after 5 seconds
        const timeoutId = setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
        
        // Clear timeout if user clicks retry
        retryBtn.addEventListener('click', () => {
            clearTimeout(timeoutId);
        }, { once: true });
    } catch (error) {
        console.error('Error in showError:', error);
        // Fallback error display
        alert(message || 'An error occurred');
    }
}

// Hide error message
function hideError() {
    try {
        errorContainer.style.display = 'none';
    } catch (error) {
        console.error('Error in hideError:', error);
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);