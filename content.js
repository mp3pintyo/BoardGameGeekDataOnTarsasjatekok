// This script will be injected into the page
console.log("BGG Rating Display extension loaded.");

// Function to get game info from the URL
function getGameInfoFromUrl() {
    const pathParts = window.location.pathname.split('/');
    // The slug is the last part of the path, e.g., "7-csoda-epiteszek-2021"
    const slug = pathParts[pathParts.length - 1];
    if (!slug) return null;

    const slugParts = slug.split('-');
    const lastPart = slugParts[slugParts.length - 1];
    let year = null;
    let nameParts = slugParts;

    // Check if the last part is a 4-digit year
    if (/^\d{4}$/.test(lastPart)) {
        year = lastPart;
        nameParts = slugParts.slice(0, -1); // Remove year from name parts
    }

    const name = nameParts.join(' ');
    return { name, year };
}


// Function to fetch BGG data
async function getBggData(gameInfo) {
    if (!gameInfo || !gameInfo.name) {
        return null;
    }

    try {
        // BGG API can be slow, so we try to be smart
        // First, search exactly with the name and year if available
        let searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameInfo.name)}&type=boardgame&exact=1`;
        let searchResponse = await fetch(searchUrl);
        let searchData = await searchResponse.text();

        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(searchData, "text/xml");
        let items = xmlDoc.getElementsByTagName("item");
        let gameId = null;

        if (items.length > 0) {
             // If we have a year, try to find the item that matches the year for better accuracy
            if (gameInfo.year) {
                 for (let item of items) {
                     const yearPublishedTag = item.querySelector("yearpublished");
                     if (yearPublishedTag && yearPublishedTag.getAttribute("value") === gameInfo.year) {
                         gameId = item.getAttribute("id");
                         break; // Found a match
                     }
                 }
            }
            // If no year match was found, or no year was provided, just take the first result.
            if (!gameId) {
                gameId = items[0].getAttribute("id");
            }
        } else {
            // If exact search fails, try a non-exact search
            searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameInfo.name)}&type=boardgame`;
            searchResponse = await fetch(searchUrl);
            searchData = await searchResponse.text();
            xmlDoc = parser.parseFromString(searchData, "text/xml");
            items = xmlDoc.getElementsByTagName("item");
            if (items.length > 0) {
                gameId = items[0].getAttribute("id");
            }
        }


        if (gameId) {
            // Get the game details from the thing API
            const thingUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
            const thingResponse = await fetch(thingUrl);
            const thingData = await thingResponse.text();
            const thingXmlDoc = parser.parseFromString(thingData, "text/xml");

            const rating = thingXmlDoc.querySelector("average").getAttribute("value");
            const weight = thingXmlDoc.querySelector("averageweight").getAttribute("value");
            
            // Find the suggested player age poll
            const suggestedAgePoll = thingXmlDoc.querySelector('poll[name="suggested_playerage"]');
            let suggestedAge = "N/A"; // Default value
            if (suggestedAgePoll) {
                const results = suggestedAgePoll.querySelectorAll("results > result");
                let maxVotes = -1;
                
                results.forEach(result => {
                    const numVotes = parseInt(result.getAttribute("numvotes"), 10);
                    if (numVotes > maxVotes) {
                        maxVotes = numVotes;
                        suggestedAge = result.getAttribute("value");
                    }
                });
            }

            // Find the language dependence poll
            const languagePoll = thingXmlDoc.querySelector('poll[name="language_dependence"]');
            let languageDependence = "N/A"; // Default value
            if (languagePoll) {
                const results = languagePoll.querySelectorAll("results > result");
                let maxVotes = -1;

                results.forEach(result => {
                    const numVotes = parseInt(result.getAttribute("numvotes"), 10);
                    if (numVotes > maxVotes) {
                        maxVotes = numVotes;
                        languageDependence = result.getAttribute("value");
                    }
                });
            }

            return {
                id: gameId,
                rating: parseFloat(rating).toFixed(2),
                weight: parseFloat(weight).toFixed(2),
                suggestedAge: suggestedAge,
                languageDependence: languageDependence
            };
        }
    } catch (error) {
        console.error("Error fetching BGG data:", error);
    }

    return null;
}

// Function to display the BGG rating on the page
function displayBggRating(bggData) {
    if (!bggData) {
        return;
    }

    const targetElement = document.querySelector('boardgame-properties-extended');
    if (targetElement) {
        // Remove existing container if it's there from a previous run to avoid duplicates
        const existingContainer = document.getElementById('bgg-rating-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        const bggRatingElement = document.createElement('div');
        bggRatingElement.id = 'bgg-rating-container';
        bggRatingElement.style.marginTop = '20px';
        bggRatingElement.style.padding = '10px';
        bggRatingElement.style.border = '1px solid #ccc';
        bggRatingElement.style.borderRadius = '5px';
        bggRatingElement.innerHTML = `
            <h3 style="margin-top: 0;">BoardGameGeek Adatok</h3>
            <p><strong>Értékelés:</strong> ${bggData.rating}</p>
            <p><strong>Komplexitás:</strong> ${bggData.weight}</p>
            <p><strong>Közösség által ajánlott életkor:</strong> ${bggData.suggestedAge}+</p>
            <p><strong>Nyelvfüggőség:</strong> ${bggData.languageDependence}</p>
            <p><a href="https://boardgamegeek.com/boardgame/${bggData.id}" target="_blank" rel="noopener noreferrer">BGG adatlap</a></p>
        `;
        
        // Insert the new element right after the target element
        targetElement.insertAdjacentElement('afterend', bggRatingElement);
    }
}


// Main execution
async function main() {
    const gameInfo = getGameInfoFromUrl();
    if (gameInfo && gameInfo.name) {
        const bggData = await getBggData(gameInfo);
        displayBggRating(bggData);
    }
}

main();

