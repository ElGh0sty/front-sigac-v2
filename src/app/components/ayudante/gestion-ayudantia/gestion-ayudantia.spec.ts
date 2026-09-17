import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionAyudantia } from './gestion-ayudantia';

describe('GestionAyudantia', () => {
  let component: GestionAyudantia;
  let fixture: ComponentFixture<GestionAyudantia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionAyudantia],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionAyudantia);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
