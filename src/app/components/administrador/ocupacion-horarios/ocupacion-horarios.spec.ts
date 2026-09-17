import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OcupacionHorarios } from './ocupacion-horarios';

describe('OcupacionHorarios', () => {
  let component: OcupacionHorarios;
  let fixture: ComponentFixture<OcupacionHorarios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OcupacionHorarios],
    }).compileComponents();

    fixture = TestBed.createComponent(OcupacionHorarios);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
