import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MateriaDetalle } from './materia-detalle';

describe('MateriaDetalle', () => {
  let component: MateriaDetalle;
  let fixture: ComponentFixture<MateriaDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MateriaDetalle],
    }).compileComponents();

    fixture = TestBed.createComponent(MateriaDetalle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
