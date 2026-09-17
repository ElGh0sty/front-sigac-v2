import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionClases } from './gestion-clases';

describe('GestionClases', () => {
  let component: GestionClases;
  let fixture: ComponentFixture<GestionClases>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionClases],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionClases);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
