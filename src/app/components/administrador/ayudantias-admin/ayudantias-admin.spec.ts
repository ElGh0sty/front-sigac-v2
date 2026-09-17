import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AyudantiasAdmin } from './ayudantias-admin';

describe('AyudantiasAdmin', () => {
  let component: AyudantiasAdmin;
  let fixture: ComponentFixture<AyudantiasAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AyudantiasAdmin],
    }).compileComponents();

    fixture = TestBed.createComponent(AyudantiasAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
