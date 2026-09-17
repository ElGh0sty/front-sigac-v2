import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionEstudiantes } from './gestion-estudiantes';

describe('GestionEstudiantes', () => {
  let component: GestionEstudiantes;
  let fixture: ComponentFixture<GestionEstudiantes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionEstudiantes],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionEstudiantes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
