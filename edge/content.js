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

    chrome.storage.sync.get({
        showRating: true,
        showWeight: true,
        showAge: true,
        showLanguage: true,
        hideComplexity: false,
        hidePublisherAge: false
    }, (settings) => {
        console.log('BGG Extension settings:', settings);
        const targetElement = document.querySelector('boardgame-properties-extended');
        if (targetElement) {
            // Remove existing container if it's there from a previous run to avoid duplicates
            const existingContainer = document.getElementById('bgg-rating-container');
            if (existingContainer) {
                existingContainer.remove();
            }

            // Design finomhangolás: Tarsasjatekok.com Komplexitás elrejtése (MutationObserver-rel)
            if (settings.hideComplexity) {
                function hideComplexityProp() {
                    const elems = document.querySelectorAll('.boardgame_prop .prop');
                    if (elems.length >= 5) {
                        elems[4].style.display = 'none';
                        return true;
                    }
                    return false;
                }

                if (!hideComplexityProp()) {
                    const observer = new MutationObserver(() => {
                        if (hideComplexityProp()) {
                            observer.disconnect();
                        }
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                }
            }

            // Design finomhangolás: Tarsasjatekok.com Kiadó ajánlott életkor elrejtése (MutationObserver-rel)
            if (settings.hidePublisherAge) {
                function hidePublisherAgeProp() {
                    const elems = document.querySelectorAll('.boardgame_prop .prop');
                    if (elems.length >= 4) {
                        elems[3].style.display = 'none';
                        return true;
                    }
                    return false;
                }

                if (!hidePublisherAgeProp()) {
                    const observer = new MutationObserver(() => {
                        if (hidePublisherAgeProp()) {
                            observer.disconnect();
                        }
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                }
            }

            const bggRatingElement = document.createElement('div');
            bggRatingElement.id = 'bgg-rating-container';
            bggRatingElement.style.marginTop = '20px';
            bggRatingElement.style.padding = '10px';
            bggRatingElement.style.border = '1px solid #ccc';
            bggRatingElement.style.borderRadius = '5px';

            const titleRow = document.createElement('div');
            titleRow.style.display = 'flex';
            titleRow.style.alignItems = 'center';

            const title = document.createElement('h3');
            title.style.marginTop = '0';
            title.style.marginBottom = '0';
            title.style.flex = 'none';
            title.textContent = 'BoardGameGeek Adatok';

            // Settings icon
            const settingsIcon = document.createElement('i');
            settingsIcon.className = 'fa fa-cog';
            settingsIcon.style.fontSize = '22px';
            settingsIcon.style.marginLeft = '10px';
            settingsIcon.style.cursor = 'pointer';
            settingsIcon.title = 'Beállítások';
            settingsIcon.onclick = () => {
                chrome.runtime.sendMessage({ action: 'openOptions' });
            };

            titleRow.appendChild(title);
            titleRow.appendChild(settingsIcon);
            bggRatingElement.appendChild(titleRow);

            if (settings.showRating) {
                const ratingP = document.createElement('p');
                const ratingIcon = document.createElement('i');
                ratingIcon.className = 'fa fa-star';
                ratingIcon.style.marginRight = '5px';
                ratingIcon.style.color = '#2cd5b6';
                ratingP.appendChild(ratingIcon);
                const ratingStrong = document.createElement('strong');
                ratingStrong.textContent = 'Értékelés:';
                ratingP.appendChild(ratingStrong);
                ratingP.appendChild(document.createTextNode(' ' + bggData.rating));
                bggRatingElement.appendChild(ratingP);
            }
            if (settings.showWeight) {
                const weightP = document.createElement('p');
                const weightIcon = document.createElement('i');
                weightIcon.className = 'fa fa-gears';
                weightIcon.style.marginRight = '5px';
                weightIcon.style.color = '#e74c3c';
                weightP.appendChild(weightIcon);
                const weightStrong = document.createElement('strong');
                weightStrong.textContent = 'Komplexitás:';
                weightP.appendChild(weightStrong);
                weightP.appendChild(document.createTextNode(' ' + bggData.weight + '/5'));
                bggRatingElement.appendChild(weightP);
            }
            if (settings.showAge) {
                const ageP = document.createElement('p');
                const ageIcon = document.createElement('i');
                ageIcon.className = 'fa fa-birthday-cake';
                ageIcon.style.marginRight = '5px';
                ageIcon.style.color = '#f1c40f';
                ageP.appendChild(ageIcon);
                const ageStrong = document.createElement('strong');
                ageStrong.textContent = 'Közösség által ajánlott életkor:';
                ageP.appendChild(ageStrong);
                ageP.appendChild(document.createTextNode(' ' + bggData.suggestedAge + '+'));
                bggRatingElement.appendChild(ageP);
            }
            if (settings.showLanguage) {
                const langP = document.createElement('p');
                const langIcon = document.createElement('i');
                langIcon.className = 'fa fa-language';
                langIcon.style.marginRight = '5px';
                langIcon.style.color = '#3498db';
                langP.appendChild(langIcon);
                const langStrong = document.createElement('strong');
                langStrong.textContent = 'Nyelvfüggőség:';
                langP.appendChild(langStrong);
                langP.appendChild(document.createTextNode(' ' + bggData.languageDependence));
                bggRatingElement.appendChild(langP);
            }

            const linkP = document.createElement('p');
            const link = document.createElement('a');
            link.href = `https://boardgamegeek.com/boardgame/${bggData.id}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'BGG adatlap';
            linkP.appendChild(link);
            bggRatingElement.appendChild(linkP);

            // Insert the new element right after the target element
            targetElement.insertAdjacentElement('afterend', bggRatingElement);
        }
    });
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
