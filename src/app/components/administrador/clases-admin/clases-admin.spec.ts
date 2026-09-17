import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClasesAdmin } from './clases-admin';

describe('ClasesAdmin', () => {
  let component: ClasesAdmin;
  let fixture: ComponentFixture<ClasesAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClasesAdmin],
    }).compileComponents();

    fixture = TestBed.createComponent(ClasesAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
