import { Component, ViewChild } from '@angular/core';
import { LocationService } from './services/location.service';
type location = {latitude: number, longitude: number};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'maps';
  latitude = 51.678418;
  longitude = 7.809007;
  markers = new Array<any>();
  chosenLocations = new Set();
  locationForms = [null,null,null,null];
  markedLocations = {};
  initialDistance = 0;
  bestDistance = 0;
  showingPath = false;
  foundBestPath = false;
  directionRenderers = new Array<any>();
  distanceMatrix = new Array<any>();
  distanceMap = new Map();
  addressArray = [];
  showingDirections = false;


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
           // infoWindow.setPosition(pos);
           // infoWindow.setContent('Location found.');
           // infoWindow.open(map);
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
    return newMarker;
  }

  removeMarker(marker: any) {
    marker.setMap(null);
  }

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
  }

  chooseLocation(event) {
    let newLocation = {latitude: event.coords.lat,
      longitude: event.coords.lng};
  }

  addLocation() {
    this.locationForms.push(null);
  }

  setMarker(event: any) {
    let latitude;
    let longitude;
    let newMarker;
    this._locationService.getLocation(event.place.formatted_address).subscribe(l => {
      latitude = l.results[0].geometry.location.lat;
      longitude = l.results[0].geometry.location.lng;
      newMarker = this.createMarker(latitude, longitude, "");

      if(this.markedLocations[event.counter]) {
        this.removeMarker(this.markedLocations[event.counter]);
      }
      this.markedLocations[event.counter] = newMarker;
    })
  }

  async submitForm() {
    let locationsArray = [];

    this.chosenLocations.forEach(l => {
      locationsArray.push(l);
      this.addressArray.push(l.formatted_address);
    })

    this.distanceMatrix = await this.getDistanceMatrix(this.addressArray);

    let counter = 0;
    //Draws initial solution path, calculates initial distance
    for(var i = 0; i < locationsArray.length; i++) {
      let request;
      let response;
      if(i < locationsArray.length - 1) {
        this.initialDistance += this.getDistanceBetweenPlaces(locationsArray[i], locationsArray[i+1]);
      } else {
        this.initialDistance += this.getDistanceBetweenPlaces(locationsArray[i], locationsArray[0]);
        this.showingPath = true;
      }
      //this.renderPath(response, this.map, this.directionRenderers);
    }

    if(locationsArray.length > 3) {
      let bestArray = await this.simulatedAnnealing(locationsArray);
      this.directionRenderers.forEach(r => {
        r.setMap(null);
      })
      this.foundBestPath = true;
      this.showingDirections = true;
      for(var i = 0; i < bestArray.length; i++) {
        let response;
        if(i < bestArray.length - 1) {
          response = await this.getDirectionsServiceResponse(bestArray[i], bestArray[i+1]);
        } else {
          response = await this.getDirectionsServiceResponse(bestArray[i], bestArray[0]);
        }
        this.renderPath(response, this.map, this.directionRenderers, document.getElementById('directions-panel'));
      }
      this.bestDistance = this.calculateDistance(bestArray);
    } else {
        this.foundBestPath = true;
        this.showingDirections = true;
        this.bestDistance = this.initialDistance;
        for(var i = 0; i < locationsArray.length; i++) {
          let response;
          if(i < locationsArray.length - 1) {
            response = await this.getDirectionsServiceResponse(locationsArray[i], locationsArray[i+1]);
          } else {
            response = await this.getDirectionsServiceResponse(locationsArray[i], locationsArray[0]);
          }
          this.renderPath(response, this.map, this.directionRenderers, document.getElementById('directions-panel'));
        }
    }


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


  getDirectionsServiceResponse(location1, location2): Promise<any> {
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
      // let currAdjacentDistance = this.getCurrentDistance(position1, position2, locationsArray);
      // let newAdjacentDistance = this.getNewDistance(position1, position2, locationsArray);
      // let newDistance = currentDistance;
      // newDistance += currAdjacentDistance - newAdjacentDistance;
      this.swap(position1, position2, locationsArray);
      let newDistance = this.calculateDistance(locationsArray);
      this.swap(position1, position2, locationsArray);
      if(this.acceptanceProbability(currentDistance, newDistance, temperature) > Math.random()) {
        this.swap(position1, position2, locationsArray);
        if(this.calculateDistance(locationsArray) - newDistance > 1) {
          console.log("Error: Distances are incorrect.");
        }
        currentDistance = newDistance;
        if(currentDistance < bestDistance) {
          bestArray = locationsArray.slice(0);
          bestDistance = currentDistance;
        }
      }
        temperature *= 1 - coolingRate;
    }
    console.log("The minimum distance is " + bestDistance);

    return new Promise((resolve, reject) => {
      resolve(bestArray);
    })
  }

  calculateDistance(locationsArray) {
    let distance = 0;
    for(var i = 0; i < locationsArray.length - 1; i++) {
      distance += this.getDistanceBetweenPlaces(locationsArray[i], locationsArray[i+1]);
    }
    distance += this.getDistanceBetweenPlaces(locationsArray[locationsArray.length-1], locationsArray[0]);
    return distance;
  }

  acceptanceProbability(dist1: number, dist2: number, temp: number) {
    if(dist2 < dist1) return 1;
    return Math.exp((dist1 - dist2)/temp);
  }

  getCurrentDistance(index1, index2, locationsArray): number {
    let distance1 = this.getBeforeDistance(index1, locationsArray);
    let distance2 = this.getBeforeDistance(index2, locationsArray);
    let distance3 = this.getNextDistance(index1, locationsArray);
    let distance4 = this.getNextDistance(index2, locationsArray);
    return distance1+distance2+distance3+distance4;

    // const promise1 = await this.getBeforeDistance(index1, locationsArray);
    // console.log(1);
    // const promise2 = await this.getBeforeDistance(index2, locationsArray);
    // console.log(2);
    // const promise3 = await this.getNextDistance(index1, locationsArray);
    // console.log(3);
    // const promise4 = await this.getNextDistance(index2, locationsArray);
    // console.log(4);
    //
    // //Something wrong with how this is being returned
    // return new Promise((resolve, reject) => {
    //   console.log(promise1 + promise2 + promise3 + promise4);
    //   resolve(promise1 + promise2 + promise3 + promise4);
    // })
    // return new Promise((resolve, reject)=>{
    //   const promise1 = this.getBeforeDistance(index1, locationsArray);
    //   const promise2 = this.getBeforeDistance(index2, locationsArray);
    //   const promise3 = this.getNextDistance(index1, locationsArray);
    //   const promise4 = this.getNextDistance(index2, locationsArray);
    //   const getDistance = Promise.all([promise1, promise2, promise3, promise4]).then((values)=> {
    //       let distance = 0;
    //       values.forEach(v => {distance += v});
    //       resolve(distance);
    //     })
    // })
  }

  getNewDistance(index1, index2, locationsArray): number  {
    this.swap(index1, index2, locationsArray);
    let distance = this.getCurrentDistance(index1, index2, locationsArray);
    this.swap(index1, index2, locationsArray);
    return distance;
  }

  swap(index1, index2, locationsArray) {
    let temp = locationsArray[index1];
    locationsArray[index1] = locationsArray[index2];
    locationsArray[index2] = temp;
  }

  getBeforeDistance(index, locationsArray): number  {

    if(index == 0) {
      return this.getDistanceBetweenPlaces(locationsArray[locationsArray.length - 1], locationsArray[0]);
    }
    return this.getDistanceBetweenPlaces(locationsArray[index - 1], locationsArray[index]);
  }

  getNextDistance(index, locationsArray): number {
    if(index == locationsArray.length - 1) {
      return this.getDistanceBetweenPlaces(locationsArray[index], locationsArray[0]);
    }
    return this.getDistanceBetweenPlaces(locationsArray[index], locationsArray[index+1]);
  }


  renderPath(result, map, renderArray, directionsDiv) {
    var directionsRenderer = new google.maps.DirectionsRenderer();
    renderArray.push(directionsRenderer);
    directionsRenderer.setMap(map);
    directionsRenderer.setDirections(result);
    directionsRenderer.setPanel(directionsDiv);
  }

  getDistanceBetweenPlaces(start: any, end: any): number {
    let startLocation = start.formatted_address;
    let endLocation = end.formatted_address;

    let position1 = this.addressArray.indexOf(startLocation);
    let position2 = this.addressArray.indexOf(endLocation);
    let distances : any = this.distanceMatrix[position1];
    let meters = distances.elements[position2].distance.value;
    return(meters / 1000);
  }

  computeDistance(result) : Promise<number> {
    return new Promise((resolve, request) => {
      var total = 0;
      var firstPath = result.routes[0];
      for(var j = 0; j < firstPath.legs.length; j++) {
        total += firstPath.legs[j].distance.value;
      }
      total /= 1000;
      resolve(total);
    })
  }

  formatDistance(distance: number) {
    return Math.round(distance * 100) / 100;
  }


}
