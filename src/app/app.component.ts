import { Component, ViewChild } from '@angular/core';
import { LocationService } from './services/location.service';
type location = {latitude: number, longitude: number};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  markers = new Array<any>();
  chosenLocations = new Set();
  locationForms = [null,null,null,null];
  markedLocations = {};
  initialDistance = 0;
  bestDistance = -1;
  showingPath = false;
  foundBestPath = false;
  directionRenderers = new Array<any>();
  distanceMatrix = new Array<any>();
  addressArray = [];
  showingDirections = false;
  bestArray = [];
  @ViewChild('map', {static: true}) mapElement: any;
  map: google.maps.Map;
  infoWindow = new google.maps.InfoWindow({content: "New message"});

  constructor(private _locationService: LocationService) { }

  ngOnInit() {
   const mapProperties = {
        center: new google.maps.LatLng(35.2271, -80.8431),
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP
   };
   this.map = new google.maps.Map(this.mapElement.nativeElement, mapProperties);

   //Use geolocation to locate the position of the user
   if (navigator.geolocation) {
        let infoWindow = this.infoWindow;
        let map = this.map;
         navigator.geolocation.getCurrentPosition(function(position) {
           var pos = {
             lat: position.coords.latitude,
             lng: position.coords.longitude
           };
           map.setCenter(pos);
         }, function() {
           this.handleLocationError(true, this.infoWindow, this.map.getCenter());
         });
  } else {
    //Geolocation not supported
    this.handleLocationError(false, this.infoWindow, this.map.getCenter());
  }

}

  handleLocationError(browserHasGeolocation: any, infoWindow: any, pos: any) {
     infoWindow.setPosition(pos);
     infoWindow.setContent(browserHasGeolocation ?
                           'Error: Geolocation Service Failed.' :
                           'Error: Browser does not support geolocation.');
     infoWindow.open(this.map);
   }

   async submitForm() {
     let locationsArray = [];
     this.chosenLocations.forEach(l => {
       locationsArray.push(l);
       this.addressArray.push(l.formatted_address);
     })

     this.distanceMatrix = await this.getDistanceMatrix(this.addressArray);
     (<HTMLElement>document.querySelector(".location-inputs")).style.width = "20%";
     this.initialDistance = this.calculateTourDistance(locationsArray);

     let responses = new Array<any>();
     if(locationsArray.length > 3) {
       let bestArray = await this.simulatedAnnealing(locationsArray);
       this.bestDistance = this.calculateTourDistance(bestArray);
       this.bestArray = bestArray;
       await this.renderArray(bestArray);
     } else {
       //If array has length less than 4, no need to optimize
       this.bestDistance = this.initialDistance;
       this.bestArray = locationsArray;
       await this.renderArray(locationsArray);
     }
     this.showingDirections = true;
     this.foundBestPath = true;
   }

     async renderArray(locationsArray) {
       let responses = new Array<any>();
       for(var i = 0; i < locationsArray.length; i++) {
         let response;
         if(i < locationsArray.length - 1) {
           response = await this.getDirections(locationsArray[i], locationsArray[i+1]);
         } else {
           response = await this.getDirections(locationsArray[i], locationsArray[0]);
         }
         responses.push(response);
       }
       responses.forEach(r => {
         this.renderPath(r, this.map, this.directionRenderers);
       })
     }


   getDistanceMatrix(addressArray) : Promise<any[]> {
     return new Promise((resolve, reject) => {
       var matrixService = new google.maps.DistanceMatrixService();
       matrixService.getDistanceMatrix({
         origins: addressArray,
         destinations: addressArray,
         travelMode: google.maps.TravelMode["DRIVING"],
       }, function(response, status) {
         if(status == google.maps.DistanceMatrixStatus["OK"]) {
           resolve(response.rows);
         } else {
           console.log(status);
           reject("Could not get distance matrix");
         }
       });
     })
   }

   //Calls directions API to get directions between two locations
   getDirections(location1, location2): Promise<any> {
     var directionService = new google.maps.DirectionsService();
     let request = {
       origin: location1.formatted_address,
       destination: location2.formatted_address,
       travelMode: google.maps.TravelMode["DRIVING"]
     }
     return new Promise((resolve, reject) => {
       directionService.route(request, function(response, status) {
           if(status == google.maps.DirectionsStatus["OK"]) {
             resolve(response);
           } else {
             reject("Error with directions");
           }
       })
     })
   }

   async simulatedAnnealing(locationsArray): Promise<Array<any>> {
     let bestArray = locationsArray.slice(0);
     let bestDistance = this.initialDistance;
     let temperature = 10000;
     let coolingRate = 0.003;
     let currentDistance = this.initialDistance;
     let iteration = 0;
     while(temperature > 1) {
       let position1 = Math.floor(Math.random()*locationsArray.length);
       let position2 = Math.floor(Math.random()*locationsArray.length);
       this.swap(position1, position2, locationsArray);
       let newDistance = this.calculateTourDistance(locationsArray);
       this.swap(position1, position2, locationsArray);
       if(this.acceptanceProbability(currentDistance, newDistance, temperature) > Math.random()) {
         this.swap(position1, position2, locationsArray);
         currentDistance = newDistance;
         if(currentDistance < bestDistance) {
           bestArray = locationsArray.slice(0);
           bestDistance = currentDistance;
         }
       }
         temperature *= 1 - coolingRate;
     }
     return new Promise((resolve, reject) => {
       resolve(bestArray);
     })
   }

   acceptanceProbability(dist1: number, dist2: number, temp: number) {
     if(dist2 < dist1) return 1;
     return Math.exp((dist1 - dist2)/temp);
   }

   //Distance between all consecutive entries + distance between last and first
   calculateTourDistance(locationsArray) {
     let distance = 0;
     for(var i = 0; i < locationsArray.length - 1; i++) {
       distance += this.getDistanceBetweenPlaces(locationsArray[i], locationsArray[i+1]);
     }
     distance += this.getDistanceBetweenPlaces(locationsArray[locationsArray.length-1], locationsArray[0]);
     return distance;
   }

   swap(index1, index2, locationsArray) {
     let temp = locationsArray[index1];
     locationsArray[index1] = locationsArray[index2];
     locationsArray[index2] = temp;
   }

  //Creates marker at given latitude and longitude, title
  createMarker(latitude: number, longitude: number, titleString: string) {
    let latLng = new google.maps.LatLng(latitude, longitude);
    let newMarker = new google.maps.Marker({
      position: latLng,
      title: titleString
    })
    this.map.setCenter(latLng);
    this.markers.push(newMarker);
    newMarker.setMap(this.map);
    this.fitMapBounds();
    return newMarker;
  }

  //Controls zooming in and out of the map based on markers placed
  fitMapBounds() {
    var boundaries = new google.maps.LatLngBounds();
    for (let i = 0; i < this.markers.length; i++) {
     boundaries.extend(this.markers[i].getPosition());
    }
    this.map.fitBounds(boundaries);
  }

  //Resets UI
  clearForm() {
    this.markers.forEach(m => {
      m.setMap(null);
    })
    this.chosenLocations = new Set();
    let inputs = document.querySelectorAll('input');
    inputs.forEach(i => {
      i.value = "";
    })
    this.directionRenderers.forEach(r => {
      r.setMap(null);
      r.setPanel(null);
    })
    this.showingDirections = false;
    this.showingPath = false;
    this.foundBestPath = false;
    this.initialDistance = 0;
    this.bestDistance = 0;
    this.locationForms = [null, null, null, null];
    (<HTMLElement>document.querySelector(".location-inputs")).style.width = "100%";
  }

  //When event occurs in location entry component, creates marker at specified location
  setMarker(event: any) {
    let latitude;
    let longitude;
    let newMarker;
    this._locationService.getLocation(event.place.formatted_address).subscribe(l => {
      latitude = l.results[0].geometry.location.lat;
      longitude = l.results[0].geometry.location.lng;
      newMarker = this.createMarker(latitude, longitude, "");

      if(this.markedLocations[event.counter]) {
        this.markedLocations[event.counter].setMap(null);
      }
      this.markedLocations[event.counter] = newMarker;
    })
  }

  //Given a directions result, renders the result on the map
  renderPath(result, map, renderArray) {
    var options = {
      suppressMarkers: true,
      preserveViewport: true
    }
    var directionsRenderer = new google.maps.DirectionsRenderer(options);
    renderArray.push(directionsRenderer);
    directionsRenderer.setMap(map);
    directionsRenderer.setDirections(result);
    return new Promise((resolve, reject) => {
      resolve(true);
    })
  }

  getDistanceBetweenPlaces(start: any, end: any): number {
    let startLocation = start.formatted_address;
    let endLocation = end.formatted_address;
    let position1 = this.addressArray.indexOf(startLocation);
    let position2 = this.addressArray.indexOf(endLocation);
    let distances : any = this.distanceMatrix[position1];
    return distances.elements[position2].distance.value / 1000;
  }

  formatDistance(distance: number) {
    return Math.round(distance * 100) / 100;
  }
}
