import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Observable} from 'rxjs/Observable';

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  constructor(private http:HttpClient) {}

    //Using address of location, formats URL of get request to call geocoding API
    getLocation(address: string): any {
      var splitArray = address.split(" ");
      var formattedURL = "";
      splitArray.forEach(s => {
        formattedURL += s;
        formattedURL += "+";
      })
      formattedURL = formattedURL.slice(0, -1);
      console.log(formattedURL);
      return this.http.get('https://maps.googleapis.com/maps/api/geocode/json?address='+formattedURL+'&key=AIzaSyDhWyjUW71lVbUpqE-G4dNGQ3TaXGBX-wI');
    }

    getDistanceMatrix(locationsArray) {
      var originsURL = "";
      locationsArray.forEach(l => {
        var address = l.formatted_address;
        var formattedURL = this.getFormattedURL(address);
        originsURL += formattedURL;
        originsURL += "|";
      })
      originsURL = originsURL.slice(0, -1);
      // var xhr = new XMLHttpRequest();
      // xhr.open()
      return this.http.get('https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins='+originsURL+'&destinations='+originsURL+'&key=AIzaSyDhWyjUW71lVbUpqE-G4dNGQ3TaXGBX-wI');

    }

    getFormattedURL(address) {
      var splitArray = address.split(" ");
      var formattedURL = "";
      splitArray.forEach(s => {
        formattedURL += s;
        formattedURL += "+";
      })
      return formattedURL.slice(0, -1);
    }

}
