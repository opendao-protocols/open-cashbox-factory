import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CashboxDetailComponent } from './cashbox-detail.component';

describe('CashboxDetailComponent', () => {
  let component: CashboxDetailComponent;
  let fixture: ComponentFixture<CashboxDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CashboxDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CashboxDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
