const clientId = "b3f43e0d8e6c4c6cbe86ed9abed26e04";
const redirectUri = "http://127.0.0.1:5500/"; // Replace with your redirect URI
const authEndpoint = "https://accounts.spotify.com/authorize";
const scopes = ["user-read-private", "user-read-email"];

function getAccessToken() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");

    window.history.replaceState({}, document.title, redirectUri); // Clean the URL

    return token;
}

function authenticateUser() {
    const authUrl = `${authEndpoint}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scopes.join("%20")}`;
    window.location.href = authUrl;
}

let accessToken = getAccessToken();

if (!accessToken) {
    document.body.innerHTML = `<button onclick="authenticateUser()">Login with Spotify</button>`;
} else {
    console.log("Access Token:", accessToken);
}

async function searchSongs(query) {
    if (!accessToken) {
        console.error("Access token is missing. Please authenticate first.");
        return;
    }

    try {
        const response = await fetch (`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Spotify API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Search Response:", data); // Debugging
        console.log("searching for", query);
        displaySongs(data.tracks.items);
    } catch (error) {
        console.error("Error fetching songs:", error);
    }
}

function displaySongs(songs) {
    const musicContainer = document.getElementById("music-container");
    musicContainer.innerHTML = ""; // Clear previous results

    songs.forEach((track) => {
        const songCard = document.createElement("div");

        songCard.innerHTML = `
        <div class="card shadow gradient">
            <img src="${track.album.images[0].url}" class="album_cover" alt="Album Cover">
            <h3>${track.name}</h3>
            <p><u>${track.artists.map(artist => artist.name).join(", ")}</u></p>
            <a class="yt-link" href="https://www.youtube.com/results?search_query=${encodeURIComponent(track.name + ' ' + track.artists[0].name)}" target="_blank">Listen on YouTube</a>
            <div class="star-rating">
                <span class="star" data-value="1">&#9733;</span>    
                <span class="star" data-value="2">&#9733;</span>
                <span class="star" data-value="3">&#9733;</span>
                <span class="star" data-value="4">&#9733;</span>
                <span class="star" data-value="5">&#9733;</span>
            </div>
            <p>Your Rating: <span class="rating-value">0</span> stars</p>
        </div>
        `;

        musicContainer.appendChild(songCard); 


        //song rating
        const stars = songCard.querySelectorAll('.star');
        const ratingValue = songCard.querySelector('.rating-value');


        function onStarClick(event) {
            const rating = event.target.getAttribute('data-value');
            ratingValue.textContent = rating; 

            // if the star is clicked, set the rating for the song
            stars.forEach(star => {
                if (star.getAttribute('data-value') <= rating) {
                    star.classList.add('selected');
                } else {
                    star.classList.remove('selected');
                }
            });

            const trackId = track.id;
            const trackName = track.name;

            fetch('http://localhost:5500/api/rating', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    trackId,
                    trackName,
                    rating: Number(rating)
                })
            }) 
            .then(res => res.json())
            .then(data => {
                console.log('Rating saved:', data);
            })
            .catch(err => {
                console.error('Error saving rating:', err);
            });
        }

        stars.forEach(star => {
            star.addEventListener('click', onStarClick);
        });
    });

    console.log("Songs displayed successfully.");
}

document.getElementById("search_form").addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent form submission
    const query = document.getElementById("query").value.trim();
    searchSongs(query); // Call the search function with the query
});
