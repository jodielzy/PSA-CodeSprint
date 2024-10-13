class Vessel {
    constructor(id, scheduledTime, actualTime, teus, cargoType, departureTime, predictedArrival, distance) {
        this.id = id;
        this.scheduledTime = new Date(scheduledTime);  // Convert to Date object
        this.actualTime = new Date(actualTime);  // Convert to Date object
        this.teus = teus;
        this.cargoType = cargoType;
        this.serveTime = this.calculateServeTime();
        this.predictedArrival = new Date(predictedArrival);  // Predicted arrival will be set later
        this.departureTime = new Date(departureTime);  // Convert to Date object
        this.distance = distance;
        this.recommendedSpeed = this.calculateSpeed();
    }

    calculateServeTime() {
        return this.teus / 100;  // Time to load/unload containers in minutes
    }

    calculateSpeed() {
        const timeDifferenceInHours = Math.abs((this.predictedArrival - this.departureTime) / (1000 * 60 * 60));
        if (timeDifferenceInHours == 0) {
            return 20;
        } else {
            const time = (this.distance / timeDifferenceInHours).toFixed(2);
            if (time > 20) {
                return 20;
            }
            return time;
        }
    }

    // Helper function to format dates to a readable string (YYYY-MM-DD HH:mm:ss)
    formatTime(date) {
        return date.toISOString().replace('T', ' ').split('.')[0];
    }
}

class Berth {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.availableTime = new Date('1990-01-01T00:00:00');  // Start with the current time
        this.incomingVessels = [];
    }

    getNextVessels() {
        return this.incomingVessels.slice(0, 5);  // Show the next 5 vessels
    }

    assignVessel(vessel) {
        const serveStartTime = Math.max(vessel.predictedArrival || vessel.scheduledTime, this.availableTime); // Use predictedArrival if available
        const serveStartTimeDate = new Date(serveStartTime);
        const leaveTime = new Date(serveStartTimeDate.getTime() + vessel.serveTime * 60 * 1000);  // Convert minutes to milliseconds

        this.incomingVessels.push({
            vesselId: vessel.id,
            scheduledArrival: vessel.formatTime(vessel.scheduledTime),
            predictedArrival: vessel.formatTime(vessel.predictedArrival),
            leaveTime: vessel.formatTime(leaveTime),
            cargoType: vessel.cargoType,
            serveStartTime: vessel.formatTime(serveStartTimeDate),
            recommendedSpeed: vessel.recommendedSpeed
        });

        // Update the berth's available time after serving this vessel
        this.availableTime = leaveTime;
    }
}


// List of berths
var berths = [
    new Berth(1, "Berth 1"),
    new Berth(2, "Berth 2"),
    new Berth(3, "Berth 3"),
    new Berth(4, "Berth 4"),
    new Berth(5, "Berth 5"),
    new Berth(6, "Berth 6"),
    new Berth(7, "Berth 7"),
    new Berth(8, "Berth 8"),
    new Berth(9, "Berth 9"),
    new Berth(10, "Berth 10"),
    new Berth(11, "Berth 11"),
    new Berth(12, "Berth 12")
];

// Prioritize based on predicted arrival time and cargo type
function prioritizeVessels(vessels) {
    return vessels.sort((a, b) => {
        if (a.predictedArrival.getTime() !== b.predictedArrival.getTime()) {
            return a.predictedArrival - b.predictedArrival;  // Prioritize earlier predicted arrival
        }
        return a.cargoType === "Reefer" ? -1 : 1;  // Prioritize Reefer over Standard
    });
}

// Assign vessels based on priority to the earliest available berth
function assignVesselsToBerths(vessels) {
    const prioritizedVessels = prioritizeVessels(vessels);

    prioritizedVessels.forEach(vessel => {
        const earliestBerth = berths.reduce((prev, curr) => prev.availableTime < curr.availableTime ? prev : curr);
        earliestBerth.assignVessel(vessel);
    });
}

// Function to show vessel information in a table
function showVesselInfoOnMap(berthId, marker, map) {
    const berth = berths.find(b => b.id === berthId);
    console.log('Berth found:', berth);  // Log which berth was clicked

    const vessels = berth.getNextVessels();
    console.log('Vessels for this berth:', vessels);  // Log vessels assigned to the berth

    let infoContent = `<h3>${berth.name}</h3>`;
    infoContent += `<table border="1">
        <tr>
            <th>Vessel ID</th>
            <th>Scheduled Arrival</th>
            <th>Predicted Arrival</th>
            <th>Serve Start Time</th>
            <th>Leave Time</th>
            <th>Cargo Type</th>
            <th>Recommended Speed</th>
        </tr>`;

    vessels.forEach(vessel => {
        infoContent += `<tr>
            <td>${vessel.vesselId}</td>
            <td>${vessel.scheduledArrival}</td>
            <td>${vessel.predictedArrival}</td>
            <td>${vessel.serveStartTime}</td>
            <td>${vessel.leaveTime}</td>
            <td>${vessel.cargoType}</td>
            <td>${vessel.recommendedSpeed}</td>
        </tr>`;
    });

    infoContent += '</table>';

    var infoWindow = new google.maps.InfoWindow({
        content: infoContent
    });
    loadMarkers(marker, berth);
    infoWindow.open(map, marker);  // Show the popup on the map
}

let markers = [];

function checkAvailability() {
    const selectedDateTime = new Date(document.getElementById('datetime').value);

    // Log the selected date and time
    console.log("Selected DateTime:", selectedDateTime);
    console.log(markers);

    if (isNaN(selectedDateTime)) {
        alert("Please select a valid date and time.");
        return;
    }

    markers.forEach(({ marker, berth }) => {
        console.log(`Comparing selected time ${selectedDateTime} with berth ${berth.name} available time ${berth.availableTime}`);
        
        if (selectedDateTime >= berth.availableTime) {
            console.log(`Berth ${berth.name} is available.`);
            marker.setIcon({
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: "green",  // Change to green if available
                fillOpacity: 1,
                strokeWeight: 2
            });
        } else {
            console.log(`Berth ${berth.name} is unavailable.`);
            marker.setIcon({
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: "red",  // Change to red if unavailable
                fillOpacity: 1,
                strokeWeight: 2
            });
        }
    });
}

function loadMarkers(marker, berth) {
    markers.push({ marker: marker, berth: berth });
}
