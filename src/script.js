const clientId = "b3f43e0d8e6c4c6cbe86ed9abed26e04";
const redirectUri = "https://curly-succotash-jj55x464g9r4hw64-5500.app.github.dev/"; // Replace with your redirect URI
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

//load the homepage if the user is authenticated
if (!accessToken) {
    document.getElementById("center-button").style.display = "flex"; 
    document.getElementById("homepage-load").style.display = "none"; 
} 
else {
    fetchUserProfile(accessToken)
        .then(userId => {
            spotifyUserId = userId;
            console.log("Spotify User ID:", spotifyUserId); // Debugging
            loadRatedSongs(spotifyUserId); // Load rated songs after authentication
            document.getElementById("sort-select").addEventListener("change", () => {
                loadRatedSongs(spotifyUserId);
            });
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

        //fetch rating for user for each song
        const ratingRes = await fetch(`https://curly-succotash-jj55x464g9r4hw64-5500.app.github.dev/api/ratings/user/${spotifyUserId}`);
        const ratings = await ratingRes.json();



        //get average rating from all users for each song
        const averageRatingMap = await displayAverageRatings(songs);

        //hide sorting dropdown when searching
        document.getElementById("sort-options").style.display = "none"; 

        displaySongs(songs,ratings,averageRatingMap);

    } catch (error) {
        console.error("Error fetching songs:", error);
    }
}

async function displaySongs(songs, ratings = [], avgRatingMap) {
    const musicContainer = document.getElementById("music-container");
    musicContainer.innerHTML = ""; // Clear previous results

    musicContainer.classList.add("fade-out");
    
    setTimeout(() => {

        for (const track of songs) {
            const songCard = document.createElement("div");
            songCard.classList.add("card", "gradient");  // Apply your card styles directly
            songCard.id = track.id;
            
            songCard.innerHTML = `
                <img src="${track.album.images[0].url}" class="album_cover" alt="Album Cover">
                <h3>${track.name}</h3>
                <p id="artist-names"><u>${track.artists.map(artist => artist.name).join(", ")}</u></p>
                <a class="spotify-link" href="https://open.spotify.com/track/${track.id}" target="_blank">Listen on Spotify</a>
                <div class="star-rating">
                    <span class="star" data-value="1">&#9733;</span>    
                    <span class="star" data-value="2">&#9733;</span>
                    <span class="star" data-value="3">&#9733;</span>
                    <span class="star" data-value="4">&#9733;</span>
                    <span class="star" data-value="5">&#9733;</span>
                </div>
                <p id="avg-rating">Average Rating: <span class="rating-value">0</span> stars</p>
            `;
            musicContainer.appendChild(songCard);
    
    
            //song rating
            const stars = songCard.querySelectorAll('.star');
            const ratingValue = songCard.querySelector('.rating-value');
    
    
            // find a rating that matches the song id if star rating  is less than or equal to the saved rating, add the selected class
            const savedRating = ratings.find(rating => rating.trackId === track.id)
            if (savedRating) {
                stars.forEach(star => { 
                    if (star.getAttribute('data-value') <= savedRating.rating) {
                        star.classList.add('selected');
                    } else {
                        star.classList.remove('selected');
                    }
                });
            };
    
    
            //average rating display
            const avg = avgRatingMap[track.id];
            let avgText;
            if (avg !== null) {
                avgText = parseFloat(avg).toFixed(1);
            }
            else {
                avgText = "No rating";
            }
            ratingValue.textContent = avgText;
    
    
           
            // Add event listener for star rating
            async function onStarClick(event) {
                const rating = event.target.getAttribute('data-value');
                console.log("Rating selected:", rating);
    
                stars.forEach(star => {
                    star.classList.toggle('selected', star.getAttribute('data-value') <= rating);
                });
    
                await fetch('https://curly-succotash-jj55x464g9r4hw64-5500.app.github.dev/api/rating', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        trackId: track.id,
                        trackName: track.name,
                        rating: Number(rating),
                        userId: spotifyUserId
                    })
                });
                
                // Refresh average
                const avgResponse = await fetch(`https://curly-succotash-jj55x464g9r4hw64-5500.app.github.dev/api/rating/average/${track.id}`);
                const { averageRating } = await avgResponse.json();
                ratingValue.textContent = parseFloat(averageRating).toFixed(1);
    


                ratingValue.classList.add('flash');
                setTimeout(() => {
                    ratingValue.classList.remove('flash');
                }, 500);
            }
    
            stars.forEach(star => star.addEventListener('click', onStarClick));
        }
    
        console.log("Songs displayed successfully.");

        musicContainer.classList.remove("fade-out");
        musicContainer.classList.add("fade-in");

        setTimeout(() => {
            musicContainer.classList.remove("fade-in");
        },300); 

    }, 300); // Wait for fade-out to finish

    
}

async function displayAverageRatings(songs) {

    const trackIds = songs.map(track => track.id);
    const avgRes = await fetch('https://curly-succotash-jj55x464g9r4hw64-5500.app.github.dev/api/rating/averages/bulk', {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackIds })

    });

    const averageRatingMap = await avgRes.json();
    
    return averageRatingMap;
}

async function loadRatedSongs(spotifyUserId) {
    if (!accessToken || !spotifyUserId) {
        console.error("Failed to authenticate user.");
        return;
    }

    try {
            //when on the homepage display the sorting selection
            document.getElementById("sort-options").style.display = "block";

            const ratingsRes = await fetch(`https://curly-succotash-jj55x464g9r4hw64-5500.app.github.dev/api/ratings/user/${spotifyUserId}`);
            const ratings = await ratingsRes.json();

            if (!ratings.length) {
                document.getElementById("music-container").innerHTML = `<p class="no-ratingmsg">You haven't rated any songs yet.</p>`;
                return;
            };

            const trackIds = ratings.map(rating => rating.trackId);

            const chunks = [];
            for (let i = 0; i< ratings.length; i += 50) {
                const chunk = trackIds.slice(i, i + 50);
                const chunkRes = await fetch(`https://api.spotify.com/v1/tracks?ids=${chunk.join(',')}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });
                const chunkData = await chunkRes.json();
                chunks.push(...chunkData.tracks);
        }

        const avgRes = await fetch(`https://curly-succotash-jj55x464g9r4hw64-5500.app.github.dev/api/rating/averages/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackIds })
        });
        const averageRatingMap = await avgRes.json();



        // add the user's rating and average rating to each song
        for (const song of chunks) {
            const userRating = ratings.find(r => r.trackId === song.id);
            if (userRating) {
                song.userRating = userRating.rating;
            }
            else {
                song.userRating = 0;
            }

            const avgRating = averageRatingMap[song.id];
            if (avgRating) {
                song.averageRating = parseFloat(avgRating);
            }
            else {
                song.averageRating = 0;
            }
        }

        //sort by what the user wants
        const sortSelect = document.getElementById("sort-select");
        let selectedSort = "user"; //default

        if (sortSelect) {
            selectedSort = sortSelect.value;
        }

        if (selectedSort === "user") {
            chunks.sort((a, b) => b.userRating - a.userRating);
        }
        else if (selectedSort === "average") {
            chunks.sort((a,b) => b.averageRating - a.averageRating);
        }

        console.log("Sorting by:", selectedSort); 

        displaySongs(chunks, ratings, averageRatingMap);

    } catch (error) {
        console.error("Error loading rated songs:", error);
    };
};

// search
document.getElementById("search_form").addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent form submission
    const query = document.getElementById("query").value.trim();
    searchSongs(query); // Call the search function with the query
});
