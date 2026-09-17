import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MateriasAdmin } from './materias-admin';

describe('MateriasAdmin', () => {
  let component: MateriasAdmin;
  let fixture: ComponentFixture<MateriasAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MateriasAdmin],
    }).compileComponents();

    fixture = TestBed.createComponent(MateriasAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
