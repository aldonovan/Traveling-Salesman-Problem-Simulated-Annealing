import { Component, OnInit, Input, ViewChild, Output, EventEmitter} from '@angular/core';
import { LocationService } from '../../services/location.service';
import {Observable} from 'rxjs';
type location = {latitude: number, longitude: number};

@Component({
  selector: 'app-location-entry',
  templateUrl: './location-entry.component.html',
  styleUrls: ['./location-entry.component.scss']
})
export class LocationEntryComponent implements OnInit {
  @Input() counter: number;
  @ViewChild('map', {static: true}) mapElement: any;
  @Input() map: google.maps.Map;
  @Input() chosenLocations = new Set();
  @Output() notify = new EventEmitter<any>();
  currentMarker: any;
  latitude: number;
  longitude: number;
  chosenPlace = null;
  enteredLocation: string;
  constructor() { }

  ngOnInit() {
    var input = <HTMLInputElement>document.querySelectorAll('input')[this.counter-1];
    var autocomplete = new google.maps.places.Autocomplete(input);
    var global = this;
    autocomplete.addListener('place_changed', function() {
      let place = autocomplete.getPlace();
      global.notify.emit({place, counter: global.counter});
      if(!global.chosenLocations.has(place)) {
        global.chosenLocations.add(place);
      }
      if(global.chosenPlace != null) {
        global.chosenLocations.delete(global.chosenPlace);
      }
      global.chosenPlace = place;
      console.log(global.chosenLocations);
    })
  }

}
