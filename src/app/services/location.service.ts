import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Observable} from 'rxjs/Observable';

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  apiKey: string;

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
      return this.http.get('https://maps.googleapis.com/maps/api/geocode/json?address='+formattedURL+'&key=AIzaSyDQSfzcoU6ZpPQtBz6Hy7spDd-9YIKTBy8');
    }

    // getDistanceMatrix(locationsArray) {
    //   var originsURL = "";
    //   locationsArray.forEach(l => {
    //     var address = l.formatted_address;
    //     var formattedURL = this.getFormattedURL(address);
    //     originsURL += formattedURL;
    //     originsURL += "|";
    //   })
    //   originsURL = originsURL.slice(0, -1);
    //   return this.http.get('https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins='+originsURL+'&destinations='+originsURL+'&key=');
    //
    // }

    setKey(key: string) {
      this.apiKey = key;
    }

    getKey() {
      return this.apiKey;
    }


}
