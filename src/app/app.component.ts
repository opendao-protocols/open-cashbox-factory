import { Component, OnInit, AfterViewInit } from '@angular/core';


declare var $: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit, AfterViewInit {
  title = 'Open CashBox Factory';

  ngOnInit() {
  }
  ngAfterViewInit() {
  }

}
