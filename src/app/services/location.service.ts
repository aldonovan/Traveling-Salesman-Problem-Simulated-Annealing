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
      return this.http.get('https://maps.googleapis.com/maps/api/geocode/json?address='+formattedURL+'&key=AIzaSyDQSfzcoU6ZpPQtBz6Hy7spDd-9YIKTBy8');
    }

}
