import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearMateria } from './crear-materia';

describe('CrearMateria', () => {
  let component: CrearMateria;
  let fixture: ComponentFixture<CrearMateria>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearMateria],
    }).compileComponents();

    fixture = TestBed.createComponent(CrearMateria);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
