import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Postulacion } from './postulacion';

describe('Postulacion', () => {
  let component: Postulacion;
  let fixture: ComponentFixture<Postulacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Postulacion],
    }).compileComponents();

    fixture = TestBed.createComponent(Postulacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
