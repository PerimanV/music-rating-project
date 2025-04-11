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

async function fetchUserProfile(token) {
    try {
        const response = await fetch("https://api.spotify.com/v1/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch user profile");
        }

        const data = await response.json();
        console.log("User Profile:", data); // Debugging

        return data.id; // Return user ID
    }
    catch (error) {
        console.error("Error fetching user profile:", error);
    }
}; 


// user authentication and profile fetching
let accessToken = getAccessToken();
let spotifyUserId = null; 

if (!accessToken) {
    document.body.innerHTML = `<button onclick="authenticateUser()">Login with Spotify</button>`;
} 
else {
    fetchUserProfile(accessToken)
        .then(userId => {
            spotifyUserId = userId;
        });

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
        const songs = data.tracks.items;

        const ratingRes = await fetch(`http://localhost:5500/api/ratings/user/${spotifyUserId}`);
        const ratings = await ratingRes.json();

        console.log("Search Response:", data); // Debugging
        console.log("searching for", query);

        displaySongs(songs,ratings);

    } catch (error) {
        console.error("Error fetching songs:", error);
    }
}

async function displaySongs(songs, ratings = []) {
    const musicContainer = document.getElementById("music-container");
    musicContainer.innerHTML = ""; // Clear previous results

    for (const track of songs) {
        const songCard = document.createElement("div");


        console.log ("Track ID:", track.id); // Debugging

        songCard.innerHTML = `
        <div id="${track.id}" class="card shadow gradient">
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
        musicContainer.appendChild(songCard,track); 


        //song rating
        const stars = songCard.querySelectorAll('.star');
        const ratingValue = songCard.querySelector('.rating-value');
        

        // find a rating that matches the song id if star rating  is less than or equal to the saved rating, add the selected class
        const savedRating = ratings.find(rating => rating.trackId === track.id)
        if (savedRating) {
            ratingValue.textContent = savedRating.rating; // Set the rating value in the UI

            stars.forEach(star => { 
                if (star.getAttribute('data-value') <= savedRating.rating) {
                    star.classList.add('selected');
                } else {
                    star.classList.remove('selected');
                }
            });
        }
       

        function onStarClick(event) {
            const rating = event.target.getAttribute('data-value');
            ratingValue.textContent = rating;

            stars.forEach(star => {
                star.classList.toggle('selected', star.getAttribute('data-value') <= rating);
            });

            fetch('http://localhost:5500/api/rating', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trackId: track.id,
                    trackName: track.name,
                    rating: Number(rating),
                    userId: spotifyUserId
                })
            })
            .then(res => res.json())
            .then(data => console.log('Rating saved:', data))
            .catch(err => console.error('Error saving rating:', err));
        }

        stars.forEach(star => star.addEventListener('click', onStarClick));
    }

    console.log("Songs displayed successfully.");
}

async function displayUserRatings(UserId,songCard,track) {
    try {
        const response = await fetch(`http://localhost:5500/api/ratings/user/${UserId}`);
        const data = await response.json();

        console.log("User Ratings Response:", data); // Debugging

        if (response.ok) {
            console.log("User Ratings:", data.rating); // Debugging

            data.forEach(rating => {
                const songCard = document.getElementById(track.id);
                const ratingElement = songCard.querySelector('.rating-value');
                ratingElement.textContent = rating.rating; // Set the rating value in the UI
            });
        }
        else {
            throw new Error("Error fetching user ratings: ", data.message);
        }
        }
    catch (err) {
            console.error("Error fetching user ratings2: ", err);
        }
}


document.getElementById("search_form").addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent form submission
    const query = document.getElementById("query").value.trim();
    searchSongs(query); // Call the search function with the query
});
