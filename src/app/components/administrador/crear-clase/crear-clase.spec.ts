import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearClase } from './crear-clase';

describe('CrearClase', () => {
  let component: CrearClase;
  let fixture: ComponentFixture<CrearClase>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearClase],
    }).compileComponents();

    fixture = TestBed.createComponent(CrearClase);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
